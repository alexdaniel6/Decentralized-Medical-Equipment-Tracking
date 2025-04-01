;; Compliance Verifier Contract
;; Manages compliance certifications and safety standards for medical equipment

;; Define data maps
(define-map compliance-certificates
  { device-id: uint, standard-id: (string-ascii 32) }
  {
    issue-date: uint,
    expiry-date: uint,
    issuer: principal,
    certificate-hash: (buff 32),
    status: (string-ascii 16)
  }
)

(define-map compliance-standards
  { standard-id: (string-ascii 32) }
  {
    name: (string-ascii 64),
    description: (string-ascii 256),
    version: (string-ascii 16),
    required-renewal-days: uint
  }
)

;; Public functions

;; Register a compliance standard
(define-public (register-standard
    (standard-id (string-ascii 32))
    (name (string-ascii 64))
    (description (string-ascii 256))
    (version (string-ascii 16))
    (required-renewal-days uint)
  )
  (begin
    (map-set compliance-standards
      { standard-id: standard-id }
      {
        name: name,
        description: description,
        version: version,
        required-renewal-days: required-renewal-days
      }
    )
    (ok true)
  )
)

;; Issue a compliance certificate
(define-public (issue-certificate
    (device-id uint)
    (standard-id (string-ascii 32))
    (validity-days uint)
    (certificate-hash (buff 32))
  )
  (let (
      (current-time (unwrap! (get-block-info? time (- block-height u1)) (err u1)))
      (standard (unwrap! (map-get? compliance-standards { standard-id: standard-id }) (err u2)))
    )

    ;; Verify device exists (in a real implementation, we would check the device registry)

    ;; Issue the certificate
    (map-set compliance-certificates
      { device-id: device-id, standard-id: standard-id }
      {
        issue-date: current-time,
        expiry-date: (+ current-time (* validity-days u86400)), ;; Convert days to seconds
        issuer: tx-sender,
        certificate-hash: certificate-hash,
        status: "valid"
      }
    )

    (ok true)
  )
)

;; Revoke a compliance certificate
(define-public (revoke-certificate
    (device-id uint)
    (standard-id (string-ascii 32))
  )
  (let ((certificate (unwrap! (map-get? compliance-certificates { device-id: device-id, standard-id: standard-id }) (err u1))))

    ;; Only the issuer can revoke the certificate
    (asserts! (is-eq tx-sender (get issuer certificate)) (err u2))

    ;; Update the certificate status
    (map-set compliance-certificates
      { device-id: device-id, standard-id: standard-id }
      (merge certificate { status: "revoked" })
    )

    (ok true)
  )
)

;; Read-only functions

;; Get compliance certificate
(define-read-only (get-certificate (device-id uint) (standard-id (string-ascii 32)))
  (map-get? compliance-certificates { device-id: device-id, standard-id: standard-id })
)

;; Get compliance standard
(define-read-only (get-standard (standard-id (string-ascii 32)))
  (map-get? compliance-standards { standard-id: standard-id })
)

;; Check if certificate is valid
(define-read-only (is-certificate-valid (device-id uint) (standard-id (string-ascii 32)))
  (let ((certificate (unwrap! (map-get? compliance-certificates { device-id: device-id, standard-id: standard-id }) false))
        (current-time (unwrap! (get-block-info? time (- block-height u1)) false)))
    (and
      (is-eq (get status certificate) "valid")
      (< current-time (get expiry-date certificate))
    )
  )
)

;; Check if certificate is expiring soon (within 30 days)
(define-read-only (is-certificate-expiring-soon (device-id uint) (standard-id (string-ascii 32)))
  (let ((certificate (unwrap! (map-get? compliance-certificates { device-id: device-id, standard-id: standard-id }) false))
        (current-time (unwrap! (get-block-info? time (- block-height u1)) false)))
    (and
      (is-eq (get status certificate) "valid")
      (< current-time (get expiry-date certificate))
      (< (- (get expiry-date certificate) current-time) u2592000) ;; 30 days in seconds
    )
  )
)
