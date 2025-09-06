package main

import (
	"database/sql"
	"fmt"
	tpm "hackodisha/backend/tpm"
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

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

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("missing DATABASE_URL")
	}

	fmt.Printf("Starting monitor node=%s dsn=%s\n", nodeID, dsn)

	if err := waitForPostgres(dsn, 30*time.Second); err != nil {
		log.Fatalf("postgres unreachable: %v", err)
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("open db failed: %v", err)
	}
	defer func(db *sql.DB) {
		err := db.Close()
		if err != nil {
		}
	}(db)

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"role":   "monitor",
			"node":   nodeID,
		})
	})

	r.POST("/heartbeat", func(c *gin.Context) {
		var hb struct {
			NodeID  string `json:"node_id"`
			DagType string `json:"dag_type"`
			Address string `json:"address"`
			Status  string `json:"status"`
		}
		if err := c.BindJSON(&hb); err != nil {
			c.JSON(400, gin.H{"error": "bad heartbeat"})
			return
		}

		_, err := db.Exec(`
            INSERT INTO nodes_registry (node_id, dag_type, address, status, last_seen)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (node_id) DO UPDATE
            SET address=$3, status=$4, last_seen=NOW()
        `, hb.NodeID, hb.DagType, hb.Address, hb.Status)
		if err != nil {
			log.Printf("db error: %v", err)
			c.JSON(500, gin.H{"error": "db update failed"})
			return
		}

		c.JSON(200, gin.H{"ok": true})
	})

	r.GET("/nodes", func(c *gin.Context) {
		rows, err := db.Query(`
            SELECT node_id, dag_type, address, status, last_seen
            FROM nodes_registry
            WHERE NOW() - last_seen < interval '10 seconds'
        `)
		if err != nil {
			c.JSON(500, gin.H{"error": "db query failed"})
			return
		}
		defer func(rows *sql.Rows) {
			err := rows.Close()
			if err != nil {
			}
		}(rows)

		var nodes []map[string]any
		for rows.Next() {
			var id, dag, addr, status string
			var lastSeen time.Time
			if err := rows.Scan(&id, &dag, &addr, &status, &lastSeen); err != nil {
				log.Printf("scan error: %v", err)
				continue
			}
			nodes = append(nodes, map[string]any{
				"node_id":   id,
				"dag_type":  dag,
				"address":   addr,
				"status":    status,
				"last_seen": lastSeen,
			})
		}
		c.JSON(200, nodes)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("monitor listening on :%s", port)
	log.Fatal(r.Run(":" + port))
}

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
