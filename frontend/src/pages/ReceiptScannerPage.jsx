import { useState, useRef, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createTransaction } from "../store/slices/transactionSlice";
import api from "../services/api";

/**
 * @typedef {Object} LineItem
 * @property {string} description
 * @property {number} total
 */

/**
 * @typedef {Object} ReceiptResult
 * @property {number} total
 * @property {string} [merchant_name]
 * @property {string} [merchant_address]
 * @property {string} suggested_category
 * @property {string} [transaction_date]
 * @property {LineItem[]} [line_items]
 * @property {number} [subtotal]
 * @property {number} [tax]
 * @property {number} [tip]
 * @property {string} currency
 * @property {string} [payment_method]
 * @property {number} confidence_score
 */

/* ─── Receipt Scanner Page ────────────────────────────────────────────────── */
export default function ReceiptScannerPage() {
    const dispatch = useDispatch();
    const fileRef = useRef(null);

    // State for responsive design (SSR safe)
    const [isMobile, setIsMobile] = useState(false);

    /** @type {[string | null, Function]} */
    const [preview, setPreview] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [scanning, setScanning] = useState(false);

    /** @type {[ReceiptResult | null, Function]} */
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);

    /* ── Responsive Listener ───────────────────────────────────────────── */
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile(); // Check immediately on client mount
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    /* ── Image Compression Utility ─────────────────────────────────────── */
    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200; // Optimal for Gemini OCR
                    const scaleSize = MAX_WIDTH / img.width;

                    // Only scale if image is wider than 1200px
                    if (img.width > MAX_WIDTH) {
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                    } else {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    }

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // Convert to blob (70% quality JPEG is the sweet spot)
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Compression failed"));
                    }, 'image/jpeg', 0.7);
                };
            };
            reader.onerror = (e) => reject(e);
        });
    };

    /* ── File handling ─────────────────────────────────────────────────── */
    const handleFile = useCallback((file) => {
        if (!file) return;
        setResult(null);
        setError(null);
        setSaved(false);
        setPreview(URL.createObjectURL(file));
    }, []);

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const onFileChange = (e) => handleFile(e.target.files[0]);

    /* ── Scan ──────────────────────────────────────────────────────────── */
    const handleScan = async () => {
        const originalFile = fileRef.current?.files[0];
        if (!originalFile) return;

        setScanning(true);
        setError(null);
        setResult(null);

        try {
            // Compress before sending to avoid 10MB limit and standardize quality
            const compressedBlob = await compressImage(originalFile);

            const form = new FormData();
            form.append("file", compressedBlob, "receipt.jpg");

            const { data } = await api.post("/receipts/scan", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setResult(data);
        } catch (e) {
            console.error(e);
            setError(e?.response?.data?.detail || "Scanning failed. Try a clearer photo without glare.");
        } finally {
            setScanning(false);
        }
    };

    /* ── Save as transaction ───────────────────────────────────────────── */
    const handleSave = async () => {
        if (!result) return;
        try {
            await dispatch(
                createTransaction({
                    amount: result.total,
                    merchant: result.merchant_name || "Unknown Merchant",
                    category: result.suggested_category,
                    date: result.transaction_date || new Date().toISOString().split("T")[0],
                    note: result.line_items?.map((i) => i.description).join(", ") || "",
                    type: "expense",
                })
            ).unwrap();
            setSaved(true);
        } catch (e) {
            setError("Failed to save transaction.");
        }
    };

    return (
        <div style={{ ...styles.page, ...(isMobile ? styles.pageMobile : {}) }}>
            <header style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
                <span style={styles.headerIcon}>🧾</span>
                <div>
                    <h1 style={{ ...styles.title, ...(isMobile ? styles.titleMobile : {}) }}>
                        Smart Receipt Scanner
                    </h1>
                    <p style={styles.subtitle}>
                        Upload a photo — Gemini extracts everything automatically
                    </p>
                </div>
            </header>

            <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : {}) }}>
                {/* ── Upload panel ── */}
                <div style={styles.card}>
                    <div
                        style={{
                            ...styles.dropzone,
                            ...(isMobile ? styles.dropzoneMobile : {}),
                            ...(dragOver ? styles.dropzoneActive : {}),
                            ...(preview ? styles.dropzoneWithPreview : {}),
                        }}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            style={{ display: "none" }}
                            onChange={onFileChange}
                        />
                        {preview ? (
                            <img src={preview} alt="Receipt preview" style={styles.preview} />
                        ) : (
                            <div style={styles.dropzoneInner}>
                                <span style={styles.uploadIcon}>📤</span>
                                <p style={styles.dropText}>Drop receipt photo here</p>
                                <p style={styles.dropSub}>or click to browse · Max 10 MB</p>
                            </div>
                        )}
                    </div>

                    {preview && !scanning && (
                        <p style={styles.clarityTip}>
                            💡 <b>Tip:</b> Avoid bright glare and keep the receipt flat for 100% accuracy.
                        </p>
                    )}

                    {preview && (
                        <button
                            style={{ ...styles.btn, ...(scanning ? styles.btnDisabled : {}) }}
                            onClick={handleScan}
                            disabled={scanning}
                        >
                            {scanning ? (
                                <>
                                    <span style={styles.spinner} /> Gemini is reading...
                                </>
                            ) : (
                                "✨ Scan Receipt"
                            )}
                        </button>
                    )}

                    {error && <div style={styles.errorBox}>{error}</div>}
                </div>

                {/* ── Results panel ── */}
                <div style={styles.card}>
                    {!result && !scanning && (
                        <div style={styles.emptyState}>
                            <span style={{ fontSize: 56 }}>🔍</span>
                            <p style={styles.emptyText}>Extracted data will appear here</p>
                        </div>
                    )}

                    {scanning && (
                        <div style={styles.emptyState}>
                            <PulseOrbs />
                            <p style={styles.emptyText}>Analysing receipt with Gemini Vision…</p>
                        </div>
                    )}

                    {result && (
                        <div style={styles.resultWrap}>
                            <ConfidenceBadge score={result.confidence_score} />

                            <div style={styles.merchant}>
                                <span style={styles.merchantIcon}>🏪</span>
                                <div>
                                    <p style={styles.merchantName}>{result.merchant_name || "Unknown Merchant"}</p>
                                    {result.merchant_address && (
                                        <p style={styles.merchantAddr}>{result.merchant_address}</p>
                                    )}
                                </div>
                            </div>

                            <div style={styles.metaRow}>
                                {result.transaction_date && (
                                    <MetaChip icon="📅" label={result.transaction_date} />
                                )}
                                {result.payment_method && (
                                    <MetaChip icon="💳" label={result.payment_method} />
                                )}
                                <MetaChip icon="🏷️" label={result.suggested_category} accent />
                            </div>

                            {result.line_items?.length > 0 && (
                                <div style={styles.items}>
                                    <p style={styles.sectionLabel}>Line Items</p>
                                    {result.line_items.map((item, i) => (
                                        <div key={i} style={styles.lineItem}>
                                            <span style={styles.lineDesc}>{item.description}</span>
                                            {item.total != null && (
                                                <span style={styles.lineAmt}>
                                                    {result.currency} {Number(item.total).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={styles.totals}>
                                {result.subtotal != null && (
                                    <TotalRow label="Subtotal" value={result.subtotal} currency={result.currency} />
                                )}
                                {result.tax != null && (
                                    <TotalRow label="Tax" value={result.tax} currency={result.currency} />
                                )}
                                {result.tip != null && (
                                    <TotalRow label="Tip" value={result.tip} currency={result.currency} />
                                )}
                                <TotalRow label="Total" value={result.total} currency={result.currency} bold />
                            </div>

                            {!saved ? (
                                <button style={{ ...styles.btn, ...styles.btnSave }} onClick={handleSave}>
                                    ✅ Save as Transaction
                                </button>
                            ) : (
                                <div style={styles.savedBanner}>✅ Saved to your transactions!</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ConfidenceBadge({ score }) {
    const pct = Math.round(score * 100);
    const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
    return (
        <div style={{ ...styles.confBadge, borderColor: color, color }}>
            {pct}% confidence
        </div>
    );
}

function MetaChip({ icon, label, accent }) {
    return (
        <span style={{ ...styles.chip, ...(accent ? styles.chipAccent : {}) }}>
            {icon} {label}
        </span>
    );
}

function TotalRow({ label, value, currency, bold }) {
    return (
        <div style={{ ...styles.totalRow, ...(bold ? styles.totalRowBold : {}) }}>
            <span>{label}</span>
            <span>
                {currency} {Number(value).toFixed(2)}
            </span>
        </div>
    );
}

function PulseOrbs() {
    return (
        <div style={styles.orbs}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    style={{ ...styles.orb, animationDelay: `${i * 0.2}s` }}
                />
            ))}
        </div>
    );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
/** @type {Object.<string, import("react").CSSProperties>} */
const styles = {
    clarityTip: { fontSize: "12px", color: "#f59e0b", textAlign: "center", marginBottom: "8px", background: "rgba(245,158,11,0.1)", padding: "8px", borderRadius: "8px" },
    page: { padding: "28px 32px", minHeight: "100vh", background: "#0f1117" },
    header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" },
    headerIcon: { fontSize: "40px" },
    title: { margin: 0, fontSize: "26px", fontWeight: 700, color: "#f1f5f9" },
    subtitle: { margin: "4px 0 0", fontSize: "14px", color: "#64748b" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
    pageMobile: { padding: "16px" },
    headerMobile: { flexDirection: "column", alignItems: "flex-start", gap: "8px", marginBottom: "20px" },
    titleMobile: { fontSize: "22px" },
    gridMobile: { display: "flex", flexDirection: "column", gap: "16px" },
    dropzoneMobile: { minHeight: "160px", padding: "20px" },
    card: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" },
    dropzone: { border: "2px dashed #2a2d3a", borderRadius: "12px", padding: "32px", cursor: "pointer", transition: "all 0.2s", textAlign: "center", minHeight: "220px", display: "flex", alignItems: "center", justifyContent: "center" },
    dropzoneActive: { borderColor: "#6366f1", background: "rgba(99,102,241,0.05)" },
    dropzoneWithPreview: { padding: "8px", border: "2px solid #6366f1" },
    dropzoneInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
    uploadIcon: { fontSize: "48px" },
    dropText: { margin: 0, fontSize: "16px", fontWeight: 600, color: "#94a3b8" },
    dropSub: { margin: 0, fontSize: "12px", color: "#475569" },
    preview: { width: "100%", maxHeight: "340px", objectFit: "contain", borderRadius: "8px" },
    btn: { background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: "10px", padding: "12px 24px", color: "#fff", fontWeight: 700, fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "opacity 0.2s", width: "100%", boxSizing: "border-box" },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    btnSave: { background: "linear-gradient(135deg, #059669, #10b981)", marginTop: "8px" },
    errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 14px", color: "#f87171", fontSize: "13px" },
    emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", minHeight: "260px" },
    emptyText: { margin: 0, fontSize: "14px", color: "#475569" },
    resultWrap: { display: "flex", flexDirection: "column", gap: "16px" },
    confBadge: { alignSelf: "flex-start", border: "1px solid", borderRadius: "20px", padding: "3px 12px", fontSize: "12px", fontWeight: 700 },
    merchant: { display: "flex", alignItems: "flex-start", gap: "12px" },
    merchantIcon: { fontSize: "28px" },
    merchantName: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#f1f5f9" },
    merchantAddr: { margin: "4px 0 0", fontSize: "12px", color: "#64748b" },
    metaRow: { display: "flex", flexWrap: "wrap", gap: "8px" },
    chip: { background: "#1e2130", border: "1px solid #2a2d3a", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", color: "#94a3b8" },
    chipAccent: { background: "rgba(99,102,241,0.15)", borderColor: "#6366f1", color: "#a5b4fc" },
    sectionLabel: { margin: "0 0 8px", fontSize: "11px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em" },
    items: { background: "#0f1117", borderRadius: "10px", padding: "12px 16px" },
    lineItem: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1a1d27" },
    lineDesc: { fontSize: "13px", color: "#94a3b8", wordBreak: "break-word", paddingRight: "8px" },
    lineAmt: { fontSize: "13px", fontWeight: 600, color: "#e2e8f0", whiteSpace: "nowrap" },
    totals: { display: "flex", flexDirection: "column", gap: "4px" },
    totalRow: { display: "flex", justifyContent: "space-between", fontSize: "13px", color: "#94a3b8", padding: "4px 0" },
    totalRowBold: { fontSize: "16px", fontWeight: 800, color: "#f1f5f9", borderTop: "1px solid #2a2d3a", paddingTop: "10px", marginTop: "4px" },
    savedBanner: { background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", borderRadius: "10px", padding: "12px", color: "#34d399", fontWeight: 700, textAlign: "center" },
    orbs: { display: "flex", gap: "10px" },
    orb: { width: "14px", height: "14px", borderRadius: "50%", background: "#6366f1", animation: "pulse 1s infinite ease-in-out" },
    spinner: { display: "inline-block", width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
};