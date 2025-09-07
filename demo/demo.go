// auth_direct_runner.go
//
// Direct test runner for your auth nodes.
// - No environment variables needed.
// - Hardcoded node URLs, TPM storage path, TPM master key, and DB DSNs.
//
// Just run:
//
//	go run auth_direct_runner.go
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

var (
	// === CONFIG SECTION ===
	nodes = []string{
		"http://127.0.0.1:8081",
		"http://127.0.0.1:8082",
	}

	dbDsns = []string{
		"postgres://hack:hack@127.0.0.1:5433/hackodisha_node1?sslmode=disable",
		"postgres://hack:hack@127.0.0.1:5434/hackodisha_node2?sslmode=disable",
	}

	tpmMasterKey  = "dev-pass"
	tpmStorageDir = "/tmp/faketpm"

	defaultPassword = "P@ssw0rd!"
)

func main() {
	// TPM init
	t, err := NewWithEncryptedStorage(tpmStorageDir, []byte(tpmMasterKey))
	if err != nil {
		log.Fatalf("TPM init failed: %v", err)
	}
	httpClient := &http.Client{Timeout: 12 * time.Second}

	var results []string

	for i, node := range nodes {
		nodeID := fmt.Sprintf("node%d", i+1)
		username := fmt.Sprintf("cli_user_n%d_%d", i+1, time.Now().UnixNano()%1000000)

		fmt.Printf("\n=== Testing node %d (%s) with nodeID=%s username=%s ===\n", i+1, node, nodeID, username)

		// Register (expected success)
		reg, _ := buildPayloadWithTPM(t, nodeID, "register",
			map[string]interface{}{"username": username, "email": username + "@local"}, defaultPassword)
		status, body, _ := postJSON(httpClient, node+"/api/auth/sign", reg)
		results = append(results, fmt.Sprintf("[register] %s status=%d body=%s", node, status, shorten(body, 200)))

		// Duplicate register (expected fail)
		status, body, _ = postJSON(httpClient, node+"/api/auth/sign", reg)
		results = append(results, fmt.Sprintf("[register-dup] %s status=%d body=%s", node, status, shorten(body, 200)))

		// Login success
		login, _ := buildPayloadWithTPM(t, nodeID, "sign",
			map[string]interface{}{"emailOrUsername": username}, defaultPassword)
		status, body, _ = postJSON(httpClient, node+"/api/auth/sign", login)
		results = append(results, fmt.Sprintf("[login-ok] %s status=%d body=%s", node, status, shorten(body, 200)))

		// Login wrong password
		badLogin, _ := buildPayloadWithTPM(t, nodeID, "sign",
			map[string]interface{}{"emailOrUsername": username}, "wrong-"+defaultPassword)
		status, body, _ = postJSON(httpClient, node+"/api/auth/sign", badLogin)
		results = append(results, fmt.Sprintf("[login-bad] %s status=%d body=%s", node, status, shorten(body, 200)))

		// Print DB snapshot if DSN provided
		if i < len(dbDsns) {
			fmt.Printf("\n-- DB snapshot for node %d --\n", i+1)
			_ = printDBSnapshot(dbDsns[i])
		}
	}

	fmt.Println("\n=== SUMMARY ===")
	for _, r := range results {
		fmt.Println(r)
	}
}

// --- Helpers ---

func buildPayloadWithTPM(t *TPM, childID, eventType string, eventPayload map[string]interface{}, password string) ([]byte, error) {
	_, _, err := t.CreateChild(childID, "auth-node")
	if err != nil {
		return nil, err
	}
	msg := []byte("heartbeat:" + childID)
	childSig, updatedAtt, err := t.Sign(childID, msg)
	if err != nil {
		return nil, err
	}
	parentPub := t.ParentPublicB64()
	childSigB64 := base64.StdEncoding.EncodeToString(childSig)

	attMap := map[string]interface{}{
		"child_pub_b64":      updatedAtt.ChildPubB64,
		"created_at_unix":    updatedAtt.CreatedAtUnix,
		"policy":             updatedAtt.Policy,
		"counter":            updatedAtt.Counter,
		"sig_b64":            updatedAtt.SigB64,
		"signed_payload_b64": updatedAtt.SignedPayloadB64,
	}
	attBytes, _ := json.Marshal(attMap)
	h := sha256.Sum256(attBytes)
	attHash := fmt.Sprintf("%x", h[:])

	payload := map[string]interface{}{
		"node_id":          childID,
		"nonce":            fmt.Sprintf("cli-%d", time.Now().UnixNano()),
		"parent_pub_b64":   parentPub,
		"child_sig_b64":    childSigB64,
		"attestation":      attMap,
		"attestation_hash": attHash,
		"event_type":       eventType,
		"event_payload":    eventPayload,
		"parents":          []string{},
		"node_signature":   "",
	}
	if password != "" {
		payload["password"] = password
	}
	b, _ := json.Marshal(payload)
	return b, nil
}

func postJSON(client *http.Client, url string, body []byte) (int, string, error) {
	req, _ := http.NewRequest("POST", url, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return 0, "", err
	}
	defer resp.Body.Close()
	buf := new(bytes.Buffer)
	buf.ReadFrom(resp.Body)
	return resp.StatusCode, buf.String(), nil
}

func shorten(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "...(truncated)"
}

func printDBSnapshot(dsn string) error {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return err
	}
	defer db.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	queries := []string{
		"SELECT id,username,email_id,node_id,created_at FROM accounts ORDER BY created_at DESC LIMIT 3;",
		"SELECT id,node_id,nonce,verified,created_at FROM node_attestations ORDER BY created_at DESC LIMIT 3;",
		"SELECT id,event_type,tx_hash,node_id,created_at FROM dag_nodes ORDER BY created_at DESC LIMIT 3;",
	}
	for _, q := range queries {
		rows, err := db.QueryContext(ctx, q)
		if err != nil {
			fmt.Printf("query error: %v\n", err)
			continue
		}
		cols, _ := rows.Columns()
		for rows.Next() {
			vals := make([]interface{}, len(cols))
			valPtrs := make([]interface{}, len(cols))
			for i := range vals {
				var s sql.NullString
				valPtrs[i] = &s
			}
			_ = rows.Scan(valPtrs...)
			m := map[string]interface{}{}
			for i, c := range cols {
				if ns := valPtrs[i].(*sql.NullString); ns.Valid {
					m[c] = ns.String
				}
			}
			b, _ := json.Marshal(m)
			fmt.Println(string(b))
		}
		rows.Close()
	}
	return nil
}
