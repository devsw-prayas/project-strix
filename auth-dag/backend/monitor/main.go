package main

import (
	"context"
	"crypto/ed25519"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	tpm "hackodisha/backend/tpm"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

// Heartbeat request payload (includes parent_pub_b64)
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

// Attestation structure (matches faketpm.Attestation)
type attestation struct {
	ChildPubB64      string `json:"child_pub_b64"`
	CreatedAtUnix    int64  `json:"created_at_unix"`
	Policy           string `json:"policy"`
	Counter          uint64 `json:"counter"`
	SigB64           string `json:"sig_b64"`
	SignedPayloadB64 string `json:"signed_payload_b64,omitempty"`
}

func main() {
	// TPM init (monitor optionally uses its own TPM parent for reference)
	storage := getenvDefault("FAKE_TPM_STORAGE", "/data/tpm")
	fake, err := tpm.NewWithEncryptedStorageFromEnv(storage)
	if err != nil {
		log.Fatalf("failed to init TPM: %v", err)
	}
	monitorParentPubB64 := fake.ParentPublicB64()

	nodeID := getenvDefault("NODE_ID", "monitor")
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatalf("missing DATABASE_URL")
	}

	if err := waitForPostgres(dsn, 30*time.Second); err != nil {
		log.Fatalf("postgres unreachable: %v", err)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("open db failed: %v", err)
	}
	defer db.Close()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "role": "monitor", "node": nodeID})
	})

	// Heartbeat handler — verifies attestation and child signature
	r.POST("/heartbeat", func(c *gin.Context) {
		var hb heartbeatPayload
		if err := c.BindJSON(&hb); err != nil {
			// single concise log for the heartbeat event
			log.Printf("heartbeat: node=%s verified=false reason=bad_json", "<unknown>")
			c.JSON(400, gin.H{"error": "bad heartbeat json"})
			return
		}

		// prepare concise logging values
		node := hb.NodeID
		verified := false
		reason := ""

		// 1) attestation hash check
		calcHash := sha256.Sum256(hb.Attestation)
		calcHashHex := fmt.Sprintf("%x", calcHash[:])
		if calcHashHex != hb.AttestationHash {
			reason = "attestation_hash_mismatch"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}

		// 2) parse attestation
		var att attestation
		if err := json.Unmarshal(hb.Attestation, &att); err != nil {
			reason = "invalid_attestation_json"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}
		if att.ChildPubB64 != hb.NodePubKey {
			reason = "node_pub_key_mismatch"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}

		// choose parent pub: prefer node-provided (useful during dev/hackathon)
		parentPubB64 := monitorParentPubB64
		if hb.ParentPubB64 != "" {
			parentPubB64 = hb.ParentPubB64
		}

		// decode parent public and attestation sig
		parentPubBytes, perr := base64.StdEncoding.DecodeString(parentPubB64)
		if perr != nil {
			reason = "parent_pub_decode_error"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(500, gin.H{"error": reason})
			return
		}
		attSigBytes, err := base64.StdEncoding.DecodeString(att.SigB64)
		if err != nil {
			reason = "attestation_sig_bad_base64"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}

		// 3) Prefer SignedPayloadB64 if present — verify signature over exact bytes the TPM said it signed
		verified = false
		if att.SignedPayloadB64 != "" {
			payloadBytes, perr := base64.StdEncoding.DecodeString(att.SignedPayloadB64)
			if perr != nil {
				reason = "signed_payload_bad_base64"
				log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
				c.JSON(400, gin.H{"error": reason})
				return
			}
			if ed25519.Verify(parentPubBytes, payloadBytes, attSigBytes) {
				verified = true
			} else {
				reason = "attestation_sig_invalid_signed_payload"
				log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
				c.JSON(400, gin.H{"error": reason})
				return
			}
		}

		// 4) fallback to raw JSON and canonical if SignedPayloadB64 absent
		if !verified {
			rawOK := ed25519.Verify(parentPubBytes, hb.Attestation, attSigBytes)
			canonical := fmt.Sprintf("%s|%d|%s|%d", att.ChildPubB64, att.CreatedAtUnix, att.Policy, att.Counter)
			canOK := ed25519.Verify(parentPubBytes, []byte(canonical), attSigBytes)
			if !rawOK && !canOK {
				reason = "attestation_sig_invalid"
				log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
				c.JSON(400, gin.H{"error": reason})
				return
			}
			verified = true
		}

		// 5) Verify child signature over expected message
		msg := []byte("heartbeat:" + hb.NodeID)
		childPubBytes, err := base64.StdEncoding.DecodeString(hb.NodePubKey)
		if err != nil {
			reason = "child_pub_bad_base64"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}
		childSigBytes, err := base64.StdEncoding.DecodeString(hb.ChildSigB64)
		if err != nil {
			reason = "child_sig_bad_base64"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}
		if !ed25519.Verify(childPubBytes, msg, childSigBytes) {
			reason = "child_signature_invalid"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(400, gin.H{"error": reason})
			return
		}

		// 6) Upsert into DB (include parent_pub_b64 and counter)
		_, err = db.ExecContext(context.Background(), `
    INSERT INTO nodes_registry (
        node_id, dag_type, address, status,
        node_pub_key, parent_pub_b64, attestation, attestation_hash,
        attestation_verified_at, attestation_counter, last_seen
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,NOW(),$9,NOW())
    ON CONFLICT (node_id) DO UPDATE
      SET address=$3, status=$4, node_pub_key=$5, parent_pub_b64=$6,
          attestation=$7::jsonb, attestation_hash=$8,
          attestation_verified_at=NOW(), attestation_counter=$9, last_seen=NOW()
`, hb.NodeID, hb.DagType, hb.Address, hb.Status,
			hb.NodePubKey, hb.ParentPubB64, string(hb.Attestation), hb.AttestationHash, att.Counter)
		if err != nil {
			reason = "db_upsert_failed"
			log.Printf("heartbeat: node=%s verified=%v reason=%s", node, verified, reason)
			c.JSON(500, gin.H{"error": reason})
			return
		}

		// Success — single concise log
		verified = true
		log.Printf("heartbeat: node=%s verified=%v", node, verified)
		c.JSON(200, gin.H{
			"ok":               true,
			"attestation_hash": hb.AttestationHash,
			"node_pub_key":     hb.NodePubKey,
		})
	})

	port := getenvDefault("PORT", "8080")
	log.Fatal(r.Run(":" + port))
}

//
// === Helpers ===
//

func getenvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func waitForPostgres(dsn string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	var lastErr error
	for {
		db, err := sql.Open("postgres", dsn)
		if err == nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			err = db.PingContext(ctx)
			cancel()
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
