package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
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
	NodeID  string `json:"node_id"`
	DagType string `json:"dag_type"`
	Address string `json:"address"`
	Status  string `json:"status"`
}

func main() {

	storage := os.Getenv("FAKE_TPM_STORAGE")
	if storage == "" {
		storage = "/data/tpm"
	}

	// Initialize fake TPM with encrypted parent key
	fake, err := tpm.NewWithEncryptedStorageFromEnv(storage)
	if err != nil {
		log.Fatalf("failed to init TPM: %v", err)
	}

	// Print parent public key (base64) once — stable across restarts
	fmt.Println("Parent pub (b64):", fake.ParentPublicB64())

	// Create a child for this node (id = NODE_ID from compose)
	nodeID := os.Getenv("NODE_ID")
	if nodeID == "" {
		nodeID = "default-node"
	}

	_, att, err := fake.CreateChild(nodeID, "auth-node")
	if err != nil {
		log.Fatalf("create child failed: %v", err)
	}
	fmt.Println("Child attestation:", att)

	// Example: sign something
	msg := []byte("Test Signing")
	sig, att2, err := fake.Sign(nodeID, msg)
	if err != nil {
		log.Printf("Sign error (maybe after restart, no private in memory): %v", err)
	} else {
		fmt.Println("Child signature (len):", len(sig))
		fmt.Println("Attestation after sign:", att2)
	}

	// Config
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://hack:hack@127.0.0.1:5433/hackodisha_node1?sslmode=disable"
	}

	peers := os.Getenv("PEERS")
	var peerList []string
	if peers != "" {
		peerList = strings.Split(peers, ",")
	}

	// DAG type (auth/local/global) - optional, default "local"
	dagType := os.Getenv("DAG_TYPE")
	if dagType == "" {
		dagType = "local"
	}

	// Port and address that this node will advertise
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	address := os.Getenv("ADDRESS")
	if address == "" {
		// default to http://<NODE_ID>:<PORT> which works in Docker compose (service name)
		address = fmt.Sprintf("http://%s:%s", nodeID, port)
	}

	monitorURL := os.Getenv("MONITOR_URL") // e.g. http://strix_backend_monitor_node:8085
	heartbeatInterval := 5 * time.Second
	heartbeatStatus := "healthy" // can be extended to send different statuses

	fmt.Printf("Starting DAG server node=%s dsn=%s\n", nodeID, dsn)
	fmt.Printf("Advertised address=%s dag_type=%s\n", address, dagType)
	if len(peerList) > 0 {
		fmt.Printf("Peers: %v\n", peerList)
	}
	if monitorURL == "" {
		fmt.Println("MONITOR_URL not set -> heartbeats disabled")
	} else {
		fmt.Printf("MONITOR_URL=%s -> heartbeats enabled (every %s)\n", monitorURL, heartbeatInterval)
	}

	// Wait for Postgres
	if err := waitForPostgres(dsn, 30*time.Second); err != nil {
		log.Fatalf("postgres unreachable: %v", err)
	}

	// Optionally open DB connection if the node needs it for runtime operations
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	// keep DB open if you plan to use it, otherwise you can close immediately
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
		}
	}(db)

	// Start heartbeat goroutine if MONITOR_URL is provided
	if monitorURL != "" {
		go heartbeatLoop(monitorURL, heartbeatPayload{
			NodeID:  nodeID,
			DagType: dagType,
			Address: address,
			Status:  heartbeatStatus,
		}, heartbeatInterval)
	}

	// Gin setup
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"node":   nodeID,
			"peers":  peerList,
			"addr":   address,
			"dag":    dagType,
		})
	})

	// Root placeholder
	r.GET("/", func(c *gin.Context) {
		c.String(200, "Strix DAG server node placeholder")
	})

	log.Printf("listening on :%s", port)
	log.Fatal(r.Run(":" + port))
}

// heartbeatLoop posts the heartbeat payload to monitorURL every interval.
// It logs errors but keeps retrying indefinitely.
func heartbeatLoop(monitorURL string, payload heartbeatPayload, interval time.Duration) {
	client := &http.Client{
		Timeout: 3 * time.Second,
	}

	hbBytes, _ := json.Marshal(payload)
	url := strings.TrimRight(monitorURL, "/") + "/heartbeat"

	for {
		req, err := http.NewRequest("POST", url, bytes.NewReader(hbBytes))
		if err != nil {
			log.Printf("heartbeat: create request failed: %v", err)
			time.Sleep(interval)
			continue
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("heartbeat: request error: %v", err)
			time.Sleep(interval)
			continue
		}

		// drain/close body
		_ = resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("heartbeat: monitor returned status %d", resp.StatusCode)
		} else {
			// optionally log successful heartbeat less verbosely
			log.Printf("heartbeat: sent OK to %s", monitorURL)
		}

		time.Sleep(interval)
	}
}

// waitForPostgres retries until db is reachable or timeout.
func waitForPostgres(dsn string, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		db, err := sql.Open("postgres", dsn)
		if err == nil {
			err = db.Ping()
			err := db.Close()
			if err != nil {
				return err
			}
		}
		if err == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return err
		}
		time.Sleep(1 * time.Second)
	}
}
