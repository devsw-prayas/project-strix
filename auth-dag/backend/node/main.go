package main

import (
	"bytes"
	_ "context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	tpm "hackodisha/backend/tpm"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	_ "github.com/lib/pq"
)

// === Globals ===
var DB *sql.DB
var PeersList []string

// === Payloads ===
type heartbeatPayload struct {
	NodeID          string          `json:"node_id"`
	DagType         string          `json:"dag_type"`
	Address         string          `json:"address"`
	Status          string          `json:"status"`
	NodePubKey      string          `json:"node_pub_key"`
	ParentPubB64    string          `json:"parent_pub_b64"`
	Attestation     json.RawMessage `json:"attestation"`
	AttestationHash string          `json:"attestation_hash"`
	ChildSigB64     string          `json:"child_sig_b64"`
}

// === Auth Handler ===

func HandlerAttest(c *gin.Context) {
	var req struct {
		NodeID        string          `json:"node_id"`
		Nonce         string          `json:"nonce"`
		ParentPubB64  string          `json:"parent_pub_b64"`
		ChildSigB64   string          `json:"child_sig_b64"`
		Attestation   json.RawMessage `json:"attestation"`
		EventType     string          `json:"event_type"`
		EventPayload  json.RawMessage `json:"event_payload"`
		Parents       []string        `json:"parents"`
		AccountID     *string         `json:"account_id"`
		NodeSignature string          `json:"node_signature"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "details": err.Error()})
		return
	}
	ctx := c.Request.Context()

	// Attestation hash
	h := sha256.Sum256(req.Attestation)
	attHash := hex.EncodeToString(h[:])

	// Decode keys
	parentPubBytes, err := base64.StdEncoding.DecodeString(req.ParentPubB64)
	if err != nil {
		c.JSON(400, gin.H{"error": "bad_parent_pub"})
		return
	}
	childSig, err := base64.StdEncoding.DecodeString(req.ChildSigB64)
	if err != nil {
		c.JSON(400, gin.H{"error": "bad_child_sig"})
		return
	}

	// Parse attestation
	var att tpm.Attestation
	if err := json.Unmarshal(req.Attestation, &att); err != nil {
		c.JSON(400, gin.H{"error": "invalid_attestation_json", "details": err.Error()})
		return
	}

	// Verify TPM
	msg := []byte("heartbeat:" + req.NodeID)
	if err := tpm.VerifyChain(parentPubBytes, msg, childSig, att); err != nil {
		evidence := map[string]any{
			"att_hash":    attHash,
			"reason":      err.Error(),
			"attestation": json.RawMessage(req.Attestation),
		}
		evb, _ := json.Marshal(evidence)

		_, _ = DB.ExecContext(ctx,
			`INSERT INTO tamper_alerts (offending_node, description, evidence)
			 VALUES ($1,$2,$3)`,
			req.NodeID, "tpm_verification_failed", string(evb),
		)
		_, _ = DB.ExecContext(ctx, `
			INSERT INTO node_attestations (node_id, nonce, signature, verified, verified_at, details)
			VALUES ($1,$2,$3,false,NULL,$4::jsonb)
			ON CONFLICT (node_id, nonce) DO UPDATE
			  SET signature=EXCLUDED.signature, details=EXCLUDED.details
		`, req.NodeID, req.Nonce, req.ChildSigB64, string(req.Attestation))

		c.JSON(http.StatusUnauthorized, gin.H{"error": "verification_failed", "reason": err.Error()})
		return
	}

	// Persist atomically
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(500, gin.H{"error": "db_start_tx", "details": err.Error()})
		return
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO node_attestations (node_id, nonce, signature, verified, verified_at, details)
		VALUES ($1,$2,$3,true,NOW(),$4::jsonb)
		ON CONFLICT (node_id, nonce) DO UPDATE
		  SET signature=EXCLUDED.signature, verified=true, verified_at=NOW(), details=EXCLUDED.details
	`, req.NodeID, req.Nonce, req.ChildSigB64, string(req.Attestation))
	if err != nil {
		c.JSON(500, gin.H{"error": "db_insert_attestation", "details": err.Error()})
		return
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO nodes (node_id, tpm_pub, last_seen)
		VALUES ($1,$2,NOW())
		ON CONFLICT (node_id) DO UPDATE
		  SET tpm_pub=EXCLUDED.tpm_pub, last_seen=NOW()
	`, req.NodeID, att.ChildPubB64)
	if err != nil {
		c.JSON(500, gin.H{"error": "db_upsert_node", "details": err.Error()})
		return
	}

	// DAG node
	eventPayloadBytes := req.EventPayload
	if len(eventPayloadBytes) == 0 {
		eventPayloadBytes = []byte(`{}`)
	}
	txh := sha256.Sum256(append(append(eventPayloadBytes, []byte(req.NodeSignature)...), []byte(attHash)...))
	txHashHex := hex.EncodeToString(txh[:])

	var accountID any
	if req.AccountID != nil && *req.AccountID != "" {
		accountID = *req.AccountID
	} else {
		accountID = nil
	}
	parentsArr := pq.Array(req.Parents)

	var dagNodeID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO dag_nodes (account_id,event_type,payload,tx_hash,parents,dag_type,node_id,node_signature)
		VALUES ($1,$2,$3::jsonb,$4,$5,'auth',$6,$7)
		ON CONFLICT (tx_hash) DO NOTHING
		RETURNING id
	`, accountID, req.EventType, string(eventPayloadBytes), txHashHex, parentsArr, req.NodeID, req.NodeSignature).Scan(&dagNodeID)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(500, gin.H{"error": "db_insert_dag", "details": err.Error()})
		return
	}
	if dagNodeID == "" {
		_ = tx.QueryRowContext(ctx, `SELECT id FROM dag_nodes WHERE tx_hash=$1`, txHashHex).Scan(&dagNodeID)
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO verification_log (entity_type,entity_id,verified,verifier_node,details)
		VALUES ('dag_node',$1,true,$2,$3::jsonb)
	`, dagNodeID, req.NodeID, string(req.Attestation))
	if err != nil {
		c.JSON(500, gin.H{"error": "db_insert_verification", "details": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(500, gin.H{"error": "db_commit", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"ok":               true,
		"attestation_hash": attHash,
		"dag_tx_hash":      txHashHex,
		"dag_node_id":      dagNodeID,
	})

	go func(att json.RawMessage, txh, nodeid string) {
		propagateToPeers(att, txh, nodeid, PeersList)
	}(req.Attestation, txHashHex, req.NodeID)
}

// === Propagation ===

func propagateToPeers(att json.RawMessage, txh, nodeid string, peers []string) {
	client := &http.Client{Timeout: 3 * time.Second}
	limiter := make(chan struct{}, 6)
	var wg sync.WaitGroup

	payload := map[string]any{
		"node_id":          nodeid,
		"attestation":      att,
		"attestation_hash": txh,
	}
	body, _ := json.Marshal(payload)

	for _, p := range peers {
		wg.Add(1)
		limiter <- struct{}{}
		go func(peer string) {
			defer wg.Done()
			defer func() { <-limiter }()
			url := strings.TrimRight(peer, "/") + "/peer/attest"
			backoff := time.Millisecond * 200
			for i := 0; i < 5; i++ {
				req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
				req.Header.Set("Content-Type", "application/json")
				resp, err := client.Do(req)
				if err == nil {
					_ = resp.Body.Close()
					if resp.StatusCode == http.StatusOK {
						return
					}
				}
				time.Sleep(backoff + time.Duration(rand.Int63n(int64(backoff))))
				backoff *= 2
			}
		}(p)
	}
	wg.Wait()
}

// === Main ===

func main() {
	nodeID := getenvDefault("NODE_ID", "default-node")
	port := getenvDefault("PORT", "8080")
	address := getenvDefault("ADDRESS", "http://"+nodeID+":"+port)
	dagType := getenvDefault("DAG_TYPE", "local")
	monitorURL := os.Getenv("MONITOR_URL")
	PeersList = splitEnvList("PEERS")

	dsn := getenvDefault("DATABASE_URL", "postgres://hack:hack@127.0.0.1:5433/hackodisha_node1?sslmode=disable")

	// TPM init
	storage := getenvDefault("FAKE_TPM_STORAGE", "/data/tpm")
	fakeTPM, err := tpm.NewWithEncryptedStorageFromEnv(storage)
	if err != nil {
		log.Fatal("failed to init TPM:", err)
	}
	_, att, err := fakeTPM.CreateChild(nodeID, "auth-node")
	if err != nil {
		log.Fatal("create child failed:", err)
	}
	attJSON, _ := json.Marshal(att)
	attHash := sha256.Sum256(attJSON)
	childPub := att.ChildPubB64
	parentPub := fakeTPM.ParentPublicB64()

	// DB
	if err := waitForPostgres(dsn, 30*time.Second); err != nil {
		log.Fatal("postgres unreachable:", err)
	}
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open db failed:", err)
	}
	defer DB.Close()

	// Heartbeat loop
	if monitorURL != "" {
		go heartbeatLoop(monitorURL, heartbeatPayload{
			NodeID:          nodeID,
			DagType:         dagType,
			Address:         address,
			Status:          "healthy",
			NodePubKey:      childPub,
			ParentPubB64:    parentPub,
			Attestation:     attJSON,
			AttestationHash: fmtHex(attHash[:]),
		}, fakeTPM, 5*time.Second)
	}

	// HTTP server
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery(), gin.Logger())

	router.POST("/api/auth/sign", HandlerAttest)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "node": nodeID, "peers": PeersList, "addr": address, "dag": dagType})
	})
	router.GET("/", func(c *gin.Context) { c.String(200, "Strix DAG server node placeholder") })

	log.Printf("Auth node listening on :%s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

// === Helpers ===

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
func splitEnvList(key string) []string {
	if v := os.Getenv(key); v != "" {
		return strings.Split(v, ",")
	}
	return nil
}
func fmtHex(b []byte) string {
	hex := make([]byte, len(b)*2)
	hexDigits := "0123456789abcdef"
	for i, v := range b {
		hex[i*2] = hexDigits[v>>4]
		hex[i*2+1] = hexDigits[v&0x0f]
	}
	return string(hex)
}
func heartbeatLoop(monitorURL string, base heartbeatPayload, fake *tpm.TPM, interval time.Duration) {
	client := &http.Client{Timeout: 3 * time.Second}
	url := strings.TrimRight(monitorURL, "/") + "/heartbeat"
	for {
		msg := []byte("heartbeat:" + base.NodeID)
		sig, _, err := fake.Sign(base.NodeID, msg)
		if err != nil {
			log.Printf("heartbeat: node=%s verified=false reason=sign_failed", base.NodeID)
			time.Sleep(interval)
			continue
		}
		base.ChildSigB64 = base64.StdEncoding.EncodeToString(sig)
		hbBytes, _ := json.Marshal(base)
		req, _ := http.NewRequest("POST", url, bytes.NewReader(hbBytes))
		req.Header.Set("Content-Type", "application/json")
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("heartbeat: node=%s verified=false reason=net_error", base.NodeID)
			time.Sleep(interval)
			continue
		}
		_ = resp.Body.Close()
		if resp.StatusCode == http.StatusOK {
			log.Printf("heartbeat: node=%s verified=true", base.NodeID)
		} else {
			log.Printf("heartbeat: node=%s verified=false reason=status_%d", base.NodeID, resp.StatusCode)
		}
		time.Sleep(interval)
	}
}
func waitForPostgres(dsn string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error
	for {
		db, err := sql.Open("postgres", dsn)
		if err == nil {
			err = db.Ping()
			_ = db.Close()
			if err == nil {
				return nil
			}
			lastErr = err
		} else {
			lastErr = err
		}
		if time.Now().After(deadline) {
			return lastErr
		}
		time.Sleep(1 * time.Second)
	}
}
