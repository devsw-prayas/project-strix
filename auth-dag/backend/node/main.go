package main

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	tpm "hackodisha/backend/tpm"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

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

func main() {
	// === 1. Config ===
	nodeID := getenvDefault("NODE_ID", "default-node")
	port := getenvDefault("PORT", "8080")
	address := getenvDefault("ADDRESS", "http://"+nodeID+":"+port)
	dagType := getenvDefault("DAG_TYPE", "local")
	monitorURL := os.Getenv("MONITOR_URL")
	peers := splitEnvList("PEERS")

	dsn := getenvDefault("DATABASE_URL", "postgres://hack:hack@127.0.0.1:5433/hackodisha_node1?sslmode=disable")

	// === 2. TPM init ===
	storage := getenvDefault("FAKE_TPM_STORAGE", "/data/tpm")
	fakeTPM, err := tpm.NewWithEncryptedStorageFromEnv(storage)
	if err != nil {
		log.Fatal("failed to init TPM:", err)
	}

	// Generate child + attestation
	_, att, err := fakeTPM.CreateChild(nodeID, "auth-node")
	if err != nil {
		log.Fatal("create child failed:", err)
	}
	attJSON, _ := json.Marshal(att)
	attHash := sha256.Sum256(attJSON)
	childPub := att.ChildPubB64
	parentPub := fakeTPM.ParentPublicB64()

	// === 3. Database wait (optional) ===
	if err := waitForPostgres(dsn, 30*time.Second); err != nil {
		log.Fatal("postgres unreachable:", err)
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open db failed:", err)
	}
	defer db.Close()

	// === 4. Heartbeat goroutine ===
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

	// === 5. HTTP server ===
	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"node":   nodeID,
			"peers":  peers,
			"addr":   address,
			"dag":    dagType,
		})
	})

	r.GET("/", func(c *gin.Context) {
		c.String(200, "Strix DAG server node placeholder")
	})

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

// heartbeatLoop posts the heartbeat payload to monitorURL every interval.
// Use the concrete *tpm.TPM type so we match its Sign signature.
func heartbeatLoop(monitorURL string, base heartbeatPayload, fake *tpm.TPM, interval time.Duration) {
	client := &http.Client{Timeout: 3 * time.Second}
	url := strings.TrimRight(monitorURL, "/") + "/heartbeat"

	for {
		// Always sign fresh message
		msg := []byte("heartbeat:" + base.NodeID)
		sig, _, err := fake.Sign(base.NodeID, msg)
		if err != nil {
			// single concise log line indicating failure to sign
			log.Printf("heartbeat: node=%s verified=false reason=sign_failed", base.NodeID)
			time.Sleep(interval)
			continue
		}
		base.ChildSigB64 = base64.StdEncoding.EncodeToString(sig)

		hbBytes, _ := json.Marshal(base)
		req, err := http.NewRequest("POST", url, bytes.NewReader(hbBytes))
		if err != nil {
			log.Printf("heartbeat: node=%s verified=false reason=req_create_failed", base.NodeID)
			time.Sleep(interval)
			continue
		}
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

// waitForPostgres retries until DB is reachable or timeout expires.
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
