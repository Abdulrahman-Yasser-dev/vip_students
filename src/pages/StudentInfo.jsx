import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function StudentInfo({ setStudent }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const convertArabicToEnglishNumbers = (input) => {
    return input.replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        "https://api.alamthal.org/api/vip-students/check",
        {
          phone,
        }
      );

      if (response.data.status === true) {
        setStudent(response.data.student);
        navigate("/Questions");
      } else {
        setMessage("❌ الرقم غير مسموح له بالدخول");
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ حدث خطأ أثناء التحقق من الرقم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light px-4 py-5 text-center">
      <form
        onSubmit={handleSubmit}
        className="w-100"
        style={{ maxWidth: "500px" }}
      >
        <h2 className="mb-4 fs-3">أدخل رقم هاتفك للمتابعة</h2>
        <input
          type="tel"
          className="form-control form-control-lg text-center mb-3"
          placeholder="05xxxxxxxx"
          value={phone}
          onChange={(e) =>
            setPhone(convertArabicToEnglishNumbers(e.target.value))
          }
          pattern="05\d{8}"
          title="رقم الجوال يبدأ بـ 05 ويتكون من 10 أرقام"
          required
        />
        <button
          type="submit"
          className="btn btn-warning btn-lg w-100"
          disabled={loading}
        >
          {loading ? "⏳ جاري التحقق..." : "دخول 🚀"}
        </button>

        {message && <div className="text-danger mt-3">{message}</div>}
      </form>
    </div>
  );
}

export default StudentInfo;
