package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes registers the auth-related routes on the provided Gin router.
// These are stubs returning simple JSON so the frontend + proxy can be exercised.
// Replace the internals with real DAG/signature logic later.
func RegisterRoutes(r *gin.Engine) {
	// POST /api/auth/register
	r.POST("/api/auth/register", func(c *gin.Context) {
		// read arbitrary JSON payload into a map for now
		var body map[string]any
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON", "details": err.Error()})
			return
		}

		// TODO: verify payload_json + signature_b64 + password here

		// respond with a stubbed successful registration
		c.JSON(http.StatusOK, gin.H{
			"success":    true,
			"account_id": "demo-account",
			"tx_hash":    "stub-hash",
		})
	})

	// POST /api/auth/sign
	r.POST("/api/auth/sign", func(c *gin.Context) {
		var body map[string]any
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON", "details": err.Error()})
			return
		}

		// TODO: validate credentials/signature; produce JWT / session cookie

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user_id": "demo-user",
			"token":   "stub-token",
		})
	})
}
