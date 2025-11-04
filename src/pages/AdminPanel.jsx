import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx"; // مكتبة لقراءة Excel وCSV

const AdminPanel = () => {
  const [vipStudents, setVipStudents] = useState([]);
  const [reports, setReports] = useState([]);
  const [vipName, setVipName] = useState("");
  const [vipPhone, setVipPhone] = useState("");
  const [vipGender, setVipGender] = useState("");
  const [activeTab, setActiveTab] = useState("reports"); // reports or vip or addVip
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filePreview, setFilePreview] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("admin_logged_in")) {
      navigate("/login");
    } else {
      fetchReports();
      fetchVipStudents();
    }
  }, [navigate]);

  // جلب البلاغات
  const fetchReports = async () => {
    try {
      const res = await axios.get("https://api.alamthal.org/api/reports");
      setReports(res.data);
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البلاغ؟")) return;
    try {
      await axios.delete(`https://api.alamthal.org/api/question-reports/${id}`);
      alert("تم حذف البلاغ بنجاح");
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  // جلب طلاب VIP
  const fetchVipStudents = async () => {
    try {
      const res = await axios.get("https://api.alamthal.org/api/vip-students");
      setVipStudents(res.data);
    } catch (err) {
      console.error("Error fetching VIP students:", err);
    }
  };

  // إضافة طالب VIP جديد
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("https://api.alamthal.org/api/vip-students", {
        name: vipName,
        phone: vipPhone,
        gender: vipGender || "غير محدد",
      });
      alert("✅ تم إضافة الطالب VIP بنجاح");
      setVipName("");
      setVipPhone("");
      setVipGender("");
      fetchVipStudents();
      setActiveTab("vip");
    } catch (err) {
      console.error(err);
      alert("❌ فشل في الإضافة");
    }
  };

  // حذف طالب VIP
  const handleDeleteVip = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    try {
      await axios.delete(`https://api.alamthal.org/api/vip-students/${id}`);
      alert("تم الحذف بنجاح");
      fetchVipStudents();
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحذف");
    }
  };

  // قراءة الملف للمعاينة
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (!file) {
      setFilePreview([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: ["name", "phone"],
        defval: "",
      });
      setFilePreview(jsonData.slice(0, 10)); // عرض أول 10 صفوف فقط
    };
    reader.readAsArrayBuffer(file);
  };

  // رفع الملف
  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("❌ الرجاء اختيار ملف أولاً");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post(
        "https://api.alamthal.org/api/vip-students/bulk-upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          },
        }
      );

      alert(`✅ ${res.data.message || "تم رفع الطلاب بنجاح"}`);
      setSelectedFile(null);
      setUploadProgress(0);
      setFilePreview([]);
      fetchVipStudents();
      setActiveTab("vip");
    } catch (err) {
      console.error(err);
      alert("❌ فشل رفع الملف");
      setUploadProgress(0);
    }
  };

  return (
    <div
      className="min-vh-100"
      style={{
        backgroundColor: "#121212",
        color: "#FFD700",
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      <nav
        className="navbar navbar-dark px-3 shadow-sm"
        style={{
          backgroundColor: "#1E1E1E",
          borderBottom: "2px solid #FFD700",
        }}
      >
        <span className="navbar-brand fw-bold fs-5">لوحة التحكم</span>
        <button
          onClick={() => {
            localStorage.removeItem("admin_logged_in");
            window.location.href = "/login";
          }}
          className="btn btn-outline-warning fw-bold shadow-sm btn-sm d-flex align-items-center gap-1"
        >
          🚪 <span className="d-none d-sm-inline">تسجيل الخروج</span>
        </button>
      </nav>

      <ul className="nav nav-pills flex-column flex-md-row justify-content-center mb-4 mt-3 gap-2 px-2">
        {[
          { key: "reports", label: "📋 البلاغات" },
          { key: "vip", label: "👑 VIP" },
          { key: "addVip", label: "➕ إضافة VIP" },
        ].map((tab) => (
          <li key={tab.key} className="nav-item">
            <button
              className={`nav-link fw-bold ${
                activeTab === tab.key
                  ? "bg-warning text-dark shadow-sm"
                  : "bg-dark text-warning border border-warning"
              }`}
              style={{
                borderRadius: "0.5rem",
                transition: "all 0.2s ease-in-out",
                fontSize: "1rem",
                width: "100%",
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* المحتوى حسب التبويب */}
      {activeTab === "reports" && (
        <div>
          <h3 className="mb-3 text-center fw-bold" style={{ color: "#FFD700" }}>
            بلاغات الطلاب
          </h3>
          {reports.length === 0 ? (
            <p className="text-center">لا توجد بلاغات حالياً.</p>
          ) : (
            <div
              className="table-responsive rounded"
              style={{ border: "1px solid #FFD700" }}
            >
              <table className="table table-dark table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم الطالب</th>
                    <th>اسم الطالب</th>
                    <th>رقم الهاتف</th>
                    <th>رقم السؤال</th>
                    <th>اسم البنك</th>
                    <th>نص البلاغ</th>
                    <th>تاريخ البلاغ</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, idx) => (
                    <tr key={report.id}>
                      <td>{idx + 1}</td>
                      <td>{report.student_id}</td>
                      <td>{report.student_name}</td>
                      <td>{report.student_phone}</td>
                      <td>{report.question_number}</td>
                      <td>{report.question_category}</td>
                      <td>{report.message}</td>
                      <td>
                        {new Date(report.created_at).toLocaleString("ar-EG")}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "vip" && (
        <div>
          <h3 className="mb-3 text-center fw-bold" style={{ color: "#FFD700" }}>
            طلاب VIP
          </h3>
          {vipStudents.length === 0 ? (
            <p className="text-center">لا يوجد طلاب VIP حالياً.</p>
          ) : (
            <div
              className="table-responsive rounded"
              style={{ border: "1px solid #FFD700" }}
            >
              <table className="table table-dark table-striped table-hover mb-0">
                <thead
                  style={{
                    backgroundColor: "#FFD700",
                    color: "#121212",
                    fontWeight: "700",
                  }}
                >
                  <tr>
                    <th>#</th>
                    <th>الاسم</th>
                    <th>رقم الهاتف</th>
                    <th>تاريخ الإضافة</th>
                    <th>حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {vipStudents.map((vip, idx) => (
                    <tr key={vip.id} style={{ cursor: "default" }}>
                      <td>{idx + 1}</td>
                      <td>{vip.name}</td>
                      <td>{vip.phone}</td>
                      <td>
                        {new Date(vip.created_at).toLocaleString("ar-EG")}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteVip(vip.id)}
                        >
                          حذف
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "addVip" && (
        <div
          className="card border-0 shadow-lg p-4 rounded-4 mx-auto"
          style={{
            background: "rgba(30,30,30,0.85)",
            backdropFilter: "blur(12px)",
            maxWidth: "500px",
            width: "100%",
            color: "#FFD700",
          }}
        >
          <h2 className="text-center fw-bold mb-4">👑 إضافة طالب VIP</h2>

          {/* فورم إضافة طالب فردي */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">الاسم</label>
              <input
                type="text"
                className="form-control bg-dark text-warning border-warning"
                value={vipName}
                onChange={(e) => setVipName(e.target.value)}
                placeholder="أدخل اسم الطالب"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">رقم الهاتف</label>
              <input
                type="tel"
                className="form-control bg-dark text-warning border-warning"
                value={vipPhone}
                onChange={(e) => setVipPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-warning text-dark fw-bold w-100 py-2 rounded-pill shadow"
            >
              💾 حفظ الطالب
            </button>
          </form>

          <hr className="my-4 border-warning" />

          {/* رفع ملف Excel / CSV */}
          <div>
            <label className="form-label fw-semibold">رفع ملف الطلاب</label>
            <input
              type="file"
              accept=".csv, .xlsx"
              className="form-control bg-dark text-warning border-warning mb-2"
              onChange={handleFileSelect}
            />
            {filePreview.length > 0 && (
              <div className="table-responsive mb-2">
                <table className="table table-dark table-striped table-hover mb-0">
                  <thead
                    style={{ backgroundColor: "#FFD700", color: "#121212" }}
                  >
                    <tr>
                      <th>#</th>
                      <th>الاسم</th>
                      <th>رقم الهاتف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filePreview.map((row, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>{row.name}</td>
                        <td>{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              className="btn btn-success w-100 py-2 fw-bold"
              onClick={handleFileUpload}
            >
              ⬆ رفع الملف
            </button>
            {uploadProgress > 0 && (
              <div className="progress mt-2" style={{ height: "20px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress}%
                </div>
              </div>
            )}
            <small className="text-warning d-block mt-1">
              يمكن رفع CSV أو Excel يحتوي على الأعمدة: الاسم، رقم الهاتف
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
