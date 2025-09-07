package main

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const parentKeyFileName = "parent.key.enc" // encrypted parent key file
const childrenDirName = "children"
const gcmNonceSize = 12 // AES-GCM standard nonce size

type Attestation struct {
	ChildPubB64      string `json:"child_pub_b64"`
	CreatedAtUnix    int64  `json:"created_at_unix"`
	Policy           string `json:"policy"`
	Counter          uint64 `json:"counter"`
	SigB64           string `json:"sig_b64"`
	SignedPayloadB64 string `json:"signed_payload_b64,omitempty"` // exact bytes that were signed (base64)
}

type TPM struct {
	parentPriv ed25519.PrivateKey
	parentPub  ed25519.PublicKey

	storageDir string

	mu       sync.Mutex
	children map[string]*child // holds only children that were created in this process (private present)
}

type child struct {
	id        string
	pub       ed25519.PublicKey
	priv      ed25519.PrivateKey // nil if private not present (e.g., after restart)
	createdAt int64
	counter   uint64
	att       Attestation
}

func New() (*TPM, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	return &TPM{
		parentPriv: priv,
		parentPub:  pub,
		children:   map[string]*child{},
	}, nil
}

func NewWithEncryptedStorageFromEnv(storageDir string) (*TPM, error) {
	mk := os.Getenv("FAKE_TPM_MASTER_KEY")
	if mk == "" {
		return nil, errors.New("FAKE_TPM_MASTER_KEY env var not set")
	}
	return NewWithEncryptedStorage(storageDir, []byte(mk))
}

func NewWithEncryptedStorage(storageDir string, masterKey []byte) (*TPM, error) {
	if storageDir == "" {
		return nil, errors.New("storageDir required")
	}
	if len(masterKey) == 0 {
		return nil, errors.New("masterKey required")
	}
	if err := os.MkdirAll(storageDir, 0700); err != nil {
		return nil, err
	}
	childDir := filepath.Join(storageDir, childrenDirName)
	if err := os.MkdirAll(childDir, 0700); err != nil {
		return nil, err
	}

	t := &TPM{
		storageDir: storageDir,
		children:   map[string]*child{},
	}
	// load or create parent key (encrypted)
	if err := t.loadOrInitParentEncrypted(masterKey); err != nil {
		return nil, err
	}
	// load persisted child metadata (public keys & attestation) so GetChildInfo works across restarts
	if err := t.loadPersistedChildrenMetadata(); err != nil {
		return nil, err
	}
	return t, nil
}

func (t *TPM) ParentPublic() []byte {
	return t.parentPub
}

func (t *TPM) ParentPublicB64() string {
	return base64.StdEncoding.EncodeToString(t.parentPub)
}

func (t *TPM) CreateChild(id, policy string) (string, Attestation, error) {
	if id == "" {
		return "", Attestation{}, errors.New("child id required")
	}
	t.mu.Lock()
	defer t.mu.Unlock()

	if c, ok := t.children[id]; ok {
		return c.id, c.att, nil
	}

	metaPath := t.childMetaPath(id)
	if exists(metaPath) {
		attB, err := os.ReadFile(metaPath)
		if err != nil {
			return "", Attestation{}, fmt.Errorf("failed to read child metadata: %w", err)
		}
		var a Attestation
		if err := json.Unmarshal(attB, &a); err != nil {
			return "", Attestation{}, fmt.Errorf("bad child metadata json: %w", err)
		}
		pubBytes, err := base64.StdEncoding.DecodeString(a.ChildPubB64)
		if err != nil {
			return "", Attestation{}, fmt.Errorf("bad base64 child pub in metadata: %w", err)
		}
		c := &child{
			id:        id,
			pub:       ed25519.PublicKey(pubBytes),
			priv:      nil, // private not present after restart
			createdAt: a.CreatedAtUnix,
			counter:   a.Counter,
			att:       a,
		}
		t.children[id] = c
		return c.id, c.att, nil
	}

	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return "", Attestation{}, err
	}
	now := time.Now().Unix()
	att := Attestation{
		ChildPubB64:   base64.StdEncoding.EncodeToString(pub),
		CreatedAtUnix: now,
		Policy:        policy,
		Counter:       0,
	}

	payload, err := json.Marshal(struct {
		ChildPubB64 string `json:"child_pub_b64"`
		CreatedAt   int64  `json:"created_at_unix"`
		Policy      string `json:"policy,omitempty"`
		Counter     uint64 `json:"counter"`
	}{att.ChildPubB64, att.CreatedAtUnix, att.Policy, att.Counter})
	if err != nil {
		return "", Attestation{}, fmt.Errorf("failed to marshal attestation payload: %w", err)
	}

	sig := ed25519.Sign(t.parentPriv, payload)
	att.SigB64 = base64.StdEncoding.EncodeToString(sig)
	att.SignedPayloadB64 = base64.StdEncoding.EncodeToString(payload)

	c := &child{
		id:        id,
		pub:       pub,
		priv:      priv,
		createdAt: now,
		counter:   0,
		att:       att,
	}
	// persist metadata
	if err := t.persistChildMetadata(id, att); err != nil {
		return "", Attestation{}, fmt.Errorf("failed to persist child metadata: %w", err)
	}

	t.children[id] = c
	return id, att, nil
}

func (t *TPM) Sign(childID string, msg []byte) ([]byte, Attestation, error) {
	if childID == "" {
		return nil, Attestation{}, errors.New("child id required")
	}
	t.mu.Lock()
	defer t.mu.Unlock()

	c, ok := t.children[childID]
	if !ok {
		return nil, Attestation{}, errors.New("unknown child (no in-memory or persisted metadata)")
	}
	if c.priv == nil {
		return nil, Attestation{}, errors.New("child private key not present in memory; cannot sign")
	}

	c.counter++
	c.att.Counter = c.counter

	payload, err := json.Marshal(struct {
		ChildPubB64 string `json:"child_pub_b64"`
		CreatedAt   int64  `json:"created_at_unix"`
		Policy      string `json:"policy,omitempty"`
		Counter     uint64 `json:"counter"`
	}{c.att.ChildPubB64, c.att.CreatedAtUnix, c.att.Policy, c.att.Counter})
	if err != nil {
		childSig := ed25519.Sign(c.priv, msg)
		return childSig, c.att, fmt.Errorf("failed to marshal att payload: %w", err)
	}

	sig := ed25519.Sign(t.parentPriv, payload)
	c.att.SigB64 = base64.StdEncoding.EncodeToString(sig)
	c.att.SignedPayloadB64 = base64.StdEncoding.EncodeToString(payload)

	// persist updated attestation (so counter survives restarts)
	if err := t.persistChildMetadata(childID, c.att); err != nil {
		childSig := ed25519.Sign(c.priv, msg)
		return childSig, c.att, fmt.Errorf("sign succeeded but failed to persist attestation: %w", err)
	}

	childSig := ed25519.Sign(c.priv, msg)
	return childSig, c.att, nil
}

func (t *TPM) GetChildInfo(id string) (Attestation, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	c, ok := t.children[id]
	if ok {
		return c.att, nil
	}
	// maybe metadata on disk (load it)
	metaPath := t.childMetaPath(id)
	if exists(metaPath) {
		b, err := os.ReadFile(metaPath)
		if err != nil {
			return Attestation{}, err
		}
		var a Attestation
		if err := json.Unmarshal(b, &a); err != nil {
			return Attestation{}, err
		}
		pub, _ := base64.StdEncoding.DecodeString(a.ChildPubB64)
		c := &child{
			id:        id,
			pub:       ed25519.PublicKey(pub),
			priv:      nil,
			createdAt: a.CreatedAtUnix,
			counter:   a.Counter,
			att:       a,
		}
		t.children[id] = c
		return a, nil
	}
	return Attestation{}, errors.New("child not found")
}

func VerifyChain(parentPub, msg, childSig []byte, att Attestation) error {
	childPub, err := base64.StdEncoding.DecodeString(att.ChildPubB64)
	if err != nil {
		return err
	}
	attSig, err := base64.StdEncoding.DecodeString(att.SigB64)
	if err != nil {
		return err
	}

	var payload []byte
	if att.SignedPayloadB64 != "" {
		payload, err = base64.StdEncoding.DecodeString(att.SignedPayloadB64)
		if err != nil {
			return fmt.Errorf("bad signed_payload_b64: %w", err)
		}
	} else {
		payload, _ = json.Marshal(struct {
			ChildPubB64 string `json:"child_pub_b64"`
			CreatedAt   int64  `json:"created_at_unix"`
			Policy      string `json:"policy,omitempty"`
			Counter     uint64 `json:"counter"`
		}{att.ChildPubB64, att.CreatedAtUnix, att.Policy, att.Counter})
	}

	if !ed25519.Verify(ed25519.PublicKey(parentPub), payload, attSig) {
		return errors.New("invalid attestation signature")
	}
	if !ed25519.Verify(ed25519.PublicKey(childPub), msg, childSig) {
		return errors.New("invalid child signature")
	}
	return nil
}

func (t *TPM) PersistParentToEncryptedPath(path string, masterKey []byte) error {
	if t.parentPriv == nil {
		return errors.New("no parent private key")
	}
	key := deriveKey(masterKey)
	encrypted, err := encryptAESGCM(key, []byte(t.parentPriv))
	if err != nil {
		return err
	}
	// write atomically
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, encrypted, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// ---------- Internal parent persistence helpers (ENCRYPTED) ----------

func (t *TPM) loadOrInitParentEncrypted(masterKey []byte) error {
	path := filepath.Join(t.storageDir, parentKeyFileName)
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		// create parent key and persist (encrypted)
		pub, priv, err := ed25519.GenerateKey(rand.Reader)
		if err != nil {
			return err
		}
		key := deriveKey(masterKey)
		encrypted, err := encryptAESGCM(key, []byte(priv))
		if err != nil {
			return err
		}
		if err := os.WriteFile(path, encrypted, 0600); err != nil {
			return err
		}
		t.parentPriv = priv
		t.parentPub = pub
		return nil
	}
	// load existing encrypted key and decrypt
	enc, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	key := deriveKey(masterKey)
	plain, err := decryptAESGCM(key, enc)
	if err != nil {
		return fmt.Errorf("failed to decrypt parent key (wrong master key?): %w", err)
	}
	if len(plain) != ed25519.PrivateKeySize {
		return errors.New("invalid decrypted parent key size")
	}
	priv := ed25519.PrivateKey(plain)
	t.parentPriv = priv
	t.parentPub = priv.Public().(ed25519.PublicKey)
	return nil
}

// ---------- AES-GCM helpers ----------

func deriveKey(master []byte) []byte {
	// simple KDF: SHA256(master) -> 32 bytes
	h := sha256.Sum256(master)
	return h[:]
}

// encryptAESGCM returns nonce||ciphertext
func encryptAESGCM(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	g, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcmNonceSize)
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	ct := g.Seal(nil, nonce, plaintext, nil)
	out := make([]byte, 0, len(nonce)+len(ct))
	out = append(out, nonce...)
	out = append(out, ct...)
	return out, nil
}

// decryptAESGCM expects nonce||ciphertext
func decryptAESGCM(key, in []byte) ([]byte, error) {
	if len(in) < gcmNonceSize {
		return nil, errors.New("ciphertext too short")
	}
	nonce := in[:gcmNonceSize]
	ct := in[gcmNonceSize:]
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	g, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	plain, err := g.Open(nil, nonce, ct, nil)
	if err != nil {
		return nil, err
	}
	return plain, nil
}

// ---------- child metadata persistence helpers (unchanged) ----------

func (t *TPM) childMetaPath(childID string) string {
	return filepath.Join(t.storageDir, childrenDirName, childID+".json")
}

func (t *TPM) persistChildMetadata(childID string, att Attestation) error {
	path := t.childMetaPath(childID)
	b, err := json.MarshalIndent(att, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (t *TPM) loadPersistedChildrenMetadata() error {
	dir := filepath.Join(t.storageDir, childrenDirName)
	files, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	for _, f := range files {
		if f.IsDir() {
			continue
		}
		if filepath.Ext(f.Name()) != ".json" {
			continue
		}
		id := f.Name()[:len(f.Name())-len(".json")]
		path := filepath.Join(dir, f.Name())
		b, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed reading child metadata %s: %w", path, err)
		}
		var a Attestation
		if err := json.Unmarshal(b, &a); err != nil {
			return fmt.Errorf("bad child metadata %s: %w", path, err)
		}
		pub, err := base64.StdEncoding.DecodeString(a.ChildPubB64)
		if err != nil {
			return fmt.Errorf("bad child pub base64 %s: %w", path, err)
		}
		c := &child{
			id:        id,
			pub:       ed25519.PublicKey(pub),
			priv:      nil,
			createdAt: a.CreatedAtUnix,
			counter:   a.Counter,
			att:       a,
		}
		t.children[id] = c
	}
	return nil
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
