import { useState, useRef, useEffect, useCallback } from "react";

const CATEGORIES = ["Elektronika", "Kiyim", "Oziq-ovqat", "Uy-ro'zg'or", "Sport", "Kitoblar", "Boshqa"];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getProducts() {
  try {
    return JSON.parse(localStorage.getItem("products") || "[]");
  } catch {
    return [];
  }
}

function saveProduct(product) {
  const products = getProducts();
  products.push(product);
  localStorage.setItem("products", JSON.stringify(products));
}

function deleteProduct(id) {
  const products = getProducts().filter((p) => p.id !== id);
  localStorage.setItem("products", JSON.stringify(products));
}

// ─── Camera Modal ────────────────────────────────────────────────────────────
function CameraModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => alert("Kameraga ruxsat yo'q yoki qurilma topilmadi."));
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataURL = c.toDataURL("image/jpeg", 0.85);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(dataURL);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.cameraWrap} onClick={(e) => e.stopPropagation()}>
        <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
          {flash && <div style={styles.flashOverlay} />}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", display: "block", borderRadius: 16, maxHeight: 460, objectFit: "cover" }}
          />
          {!ready && (
            <div style={styles.camLoader}>
              <Spinner size={32} color="#f0b429" />
              <span style={{ color: "#fff", marginTop: 8, fontSize: 13 }}>Kamera yuklanmoqda…</span>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button style={styles.camCancelBtn} onClick={onClose}>Bekor</button>
          <button style={styles.captureBtn} onClick={capture} disabled={!ready}>
            <span style={styles.captureInner} />
          </button>
          <div style={{ width: 80 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Image Picker ─────────────────────────────────────────────────────────────
function ImagePicker({ images, onChange }) {
  const fileRef = useRef(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFile = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => onChange((prev) => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  const removeImage = (idx) => onChange((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div>
      <label style={styles.label}>Rasmlar</label>
      <div style={styles.imageGrid}>
        {images.map((src, i) => (
          <div key={i} style={styles.imgThumb}>
            <img src={src} alt="" style={styles.thumbImg} />
            <button style={styles.removeBtn} onClick={() => removeImage(i)}>×</button>
          </div>
        ))}
        {images.length < 6 && (
          <div style={styles.addImgBox}>
            <button style={styles.imgActionBtn} onClick={() => fileRef.current.click()}>
              <GalleryIcon />
              <span>Gallery</span>
            </button>
            <div style={styles.dividerLine} />
            <button style={styles.imgActionBtn} onClick={() => setShowCamera(true)}>
              <CameraIcon />
              <span>Kamera</span>
            </button>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFile} />
      {showCamera && (
        <CameraModal
          onCapture={(url) => { onChange((prev) => [...prev, url]); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", category: "", price: "", stock: "", description: "" });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Mahsulot nomi kiritilsin";
    if (!form.category) e.category = "Kategoriya tanlang";
    if (!form.price || isNaN(form.price) || +form.price <= 0) e.price = "To'g'ri narx kiriting";
    if (!form.stock || isNaN(form.stock) || +form.stock < 0) e.stock = "Miqdor kiriting";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    setTimeout(() => {
      saveProduct({ id: generateId(), ...form, price: +form.price, stock: +form.stock, images, createdAt: new Date().toISOString() });
      setSaving(false);
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 900);
    }, 600);
  };

  const field = (key, label, placeholder, type = "text") => (
    <div style={styles.fieldWrap}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        placeholder={placeholder}
        style={{ ...styles.input, ...(errors[key] ? styles.inputErr : {}) }}
        onFocus={() => setErrors((e) => ({ ...e, [key]: undefined }))}
      />
      {errors[key] && <span style={styles.errText}>{errors[key]}</span>}
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalBadge}>Yangi mahsulot</div>
            <h2 style={styles.modalTitle}>Mahsulot qo'shish</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.scrollBody}>
          {/* Images */}
          <ImagePicker images={images} onChange={setImages} />

          <div style={styles.divider} />

          {/* Fields */}
          <div style={styles.grid2}>
            {field("name", "Mahsulot nomi", "Masalan: iPhone 15 Pro")}
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Kategoriya</label>
              <select
                value={form.category}
                onChange={set("category")}
                style={{ ...styles.input, ...(errors.category ? styles.inputErr : {}), cursor: "pointer" }}
                onFocus={() => setErrors((e) => ({ ...e, category: undefined }))}
              >
                <option value="">— Tanlang —</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <span style={styles.errText}>{errors.category}</span>}
            </div>
          </div>

          <div style={styles.grid2}>
            {field("price", "Narx (so'm)", "0", "number")}
            {field("stock", "Miqdor (dona)", "0", "number")}
          </div>

          <div style={styles.fieldWrap}>
            <label style={styles.label}>Tavsif</label>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder="Mahsulot haqida qisqacha ma'lumot…"
              rows={3}
              style={{ ...styles.input, resize: "vertical", minHeight: 80 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.modalFooter}>
          <button style={styles.cancelBtn} onClick={onClose}>Bekor qilish</button>
          <button style={{ ...styles.saveBtn, ...(saving || saved ? styles.saveBtnActive : {}) }} onClick={handleSave} disabled={saving || saved}>
            {saved ? <><CheckIcon /> Saqlandi!</> : saving ? <><Spinner size={16} color="#fff" /> Saqlanmoqda…</> : "Saqlash →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Products List ────────────────────────────────────────────────────────────
function ProductCard({ product, onDelete }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardImgWrap}>
        {product.images?.[0]
          ? <img src={product.images[0]} alt="" style={styles.cardImg} />
          : <div style={styles.cardNoImg}><PackageIcon /></div>}
        {product.images?.length > 1 && (
          <span style={styles.imgCount}>+{product.images.length - 1}</span>
        )}
      </div>
      <div style={styles.cardBody}>
        <span style={styles.cardBadge}>{product.category}</span>
        <p style={styles.cardName}>{product.name}</p>
        <p style={styles.cardDesc}>{product.description || "—"}</p>
        <div style={styles.cardFooter}>
          <span style={styles.cardPrice}>{(+product.price).toLocaleString()} so'm</span>
          <span style={styles.cardStock}>{product.stock} dona</span>
        </div>
      </div>
      <button style={styles.deleteCardBtn} onClick={() => onDelete(product.id)}>🗑</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => { setProducts(getProducts()); }, [tick]);

  const handleDelete = (id) => { deleteProduct(id); setTick((t) => t + 1); };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.pageTitle}>Mahsulotlar</h1>
          <p style={styles.pageSubtitle}>{products.length} ta mahsulot</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowModal(true)}>
          + Yangi mahsulot
        </button>
      </div>

      {products.length === 0 ? (
        <div style={styles.emptyState}>
          <PackageIcon size={48} color="#c7c7c7" />
          <p style={{ color: "#999", marginTop: 12, fontSize: 15 }}>Hali mahsulotlar yo'q</p>
          <button style={styles.addBtn} onClick={() => setShowModal(true)}>Birinchi mahsulot qo'shish</button>
        </div>
      ) : (
        <div style={styles.productGrid}>
          {products.map((p) => (
            <ProductCard key={p.id} product={p} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <ProductModal
          onClose={() => setShowModal(false)}
          onSaved={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function PackageIcon({ size = 32, color = "#d0d0d0" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function Spinner({ size = 20, color = "#f0b429" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.7s linear infinite", marginRight: 6 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeDasharray="50 30" strokeLinecap="round" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "100vh", background: "#f5f4f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", padding: "32px 24px" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, maxWidth: 1100, margin: "0 auto 28px" },
  pageTitle: { fontSize: 28, fontWeight: 700, color: "#1a1a1a", margin: 0, letterSpacing: "-0.5px" },
  pageSubtitle: { fontSize: 13, color: "#888", margin: "4px 0 0" },
  addBtn: { background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: "pointer", letterSpacing: "0.2px", transition: "opacity .15s" },
  productGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, maxWidth: 1100, margin: "0 auto" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 8 },
  card: { background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.06)", position: "relative", transition: "box-shadow .2s" },
  cardImgWrap: { position: "relative", height: 180, background: "#f0eeea", overflow: "hidden" },
  cardImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardNoImg: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%" },
  imgCount: { position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,.55)", color: "#fff", fontSize: 11, borderRadius: 20, padding: "2px 7px", fontWeight: 600 },
  cardBody: { padding: "14px 16px 16px" },
  cardBadge: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "#888", background: "#f0eeea", borderRadius: 20, padding: "2px 8px" },
  cardName: { fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "8px 0 4px", lineHeight: 1.3 },
  cardDesc: { fontSize: 12, color: "#999", margin: "0 0 12px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardPrice: { fontSize: 15, fontWeight: 700, color: "#1a1a1a" },
  cardStock: { fontSize: 12, color: "#666", background: "#f5f5f5", borderRadius: 20, padding: "3px 9px" },
  deleteCardBtn: { position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,.9)", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modal: { background: "#fff", borderRadius: 20, width: "100%", maxWidth: 580, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 16px", borderBottom: "1px solid #f0f0f0" },
  modalBadge: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#888", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: 800, color: "#1a1a1a", margin: 0, letterSpacing: "-0.4px" },
  closeBtn: { background: "#f0f0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 20, cursor: "pointer", color: "#666", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  scrollBody: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  fieldWrap: { display: "flex", flexDirection: "column" },
  label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "#888", marginBottom: 6 },
  input: { border: "1.5px solid #e8e8e8", borderRadius: 10, padding: "10px 13px", fontSize: 14, color: "#1a1a1a", outline: "none", background: "#fafafa", transition: "border-color .15s", fontFamily: "inherit" },
  inputErr: { borderColor: "#ff4d4f", background: "#fff5f5" },
  errText: { fontSize: 11, color: "#ff4d4f", marginTop: 4 },
  divider: { height: 1, background: "#f0f0f0", margin: "20px 0" },
  imageGrid: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 },
  imgThumb: { position: "relative", width: 80, height: 80, borderRadius: 10, overflow: "hidden", border: "1.5px solid #e8e8e8" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  removeBtn: { position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,.55)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  addImgBox: { width: 170, height: 80, borderRadius: 10, border: "1.5px dashed #d0d0d0", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", gap: 0 },
  imgActionBtn: { flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 11, fontWeight: 600, borderRadius: 9, transition: "background .15s" },
  dividerLine: { width: 1, height: 36, background: "#e0e0e0" },
  modalFooter: { display: "flex", gap: 10, padding: "16px 24px 20px", borderTop: "1px solid #f0f0f0" },
  cancelBtn: { flex: 1, background: "#f5f5f5", border: "none", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#555" },
  saveBtn: { flex: 2, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "background .2s" },
  saveBtnActive: { background: "#22c55e" },
  cameraWrap: { background: "#111", borderRadius: 20, padding: 20, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center" },
  camLoader: { position: "absolute", inset: 0, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  flashOverlay: { position: "absolute", inset: 0, background: "#fff", zIndex: 10, borderRadius: 16, animation: "none", opacity: 0.8 },
  captureBtn: { width: 64, height: 64, borderRadius: "50%", border: "3px solid #fff", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  captureInner: { width: 48, height: 48, borderRadius: "50%", background: "#fff", display: "block" },
  camCancelBtn: { width: 80, background: "#333", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" },
};
