import React, { useEffect, useState } from "react";
import axios from "axios";

const QuestionPrintableView = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distribution, setDistribution] = useState({});
  const [questionColor, setQuestionColor] = useState("#ffffff"); // ← لون الخلفية
  const [breakMode, setBreakMode] = useState("per-question"); // 'per-question' | 'multi'
  const [fontSize, setFontSize] = useState("18px"); // ← حجم الخط الافتراضي

  const arabicLetters = ["أ", "ب", "ج", "د"];
  const EnglishLetters = ["A", "B", "C", "D"];
  useEffect(() => {
    const link = document.getElementById("print-style");
    if (link) {
      link.href =
        breakMode === "per-question" ? "/pdfSmall.css" : "/pdfNormal.css";
    }
  }, [breakMode]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [questionsRes, distRes] = await Promise.all([
          axios.get("https://api.alamthal.org/api/questions"),
          axios.get("https://api.alamthal.org/api/pdf-distribution"),
        ]);

        const allQuestions = questionsRes.data.data;
        const dist = distRes.data || {};
        setDistribution(dist);

        const filtered = [];
        Object.entries(dist).forEach(([category, count]) => {
          const catQuestions = allQuestions.filter(
            (q) => q.category === category
          );
          filtered.push(...catQuestions.slice(0, count));
        });

        setQuestions(filtered);
      } catch (err) {
        console.error("❌ خطأ أثناء التحميل", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (window.MathJax && questions.length > 0) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [questions, questionColor, fontSize, breakMode]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 fs-3 fw-bold">
        جاري تحميل الأسئلة... ⏳
      </div>
    );
  }

  return (
    <div
      className="bg-white text-black print-p-0"
      style={{ fontFamily: "Tajawal" }}
    >
      {/* ✅ اختيار اللون والخط والطباعة */}
      <div className="text-center mb-4 print-hidden d-flex justify-content-center gap-4 flex-wrap">
        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold fs-5 mx-2">🎨 اختر لون الأسئلة:</label>
          <input
            type="color"
            value={questionColor}
            onChange={(e) => setQuestionColor(e.target.value)}
            className="form-control form-control-color"
            style={{ width: "3rem", height: "2rem" }}
          />
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold fs-5 mx-2">🔠 حجم الخط:</label>
          <input
            type="number"
            min={10}
            max={40}
            step={1}
            value={parseInt(fontSize)}
            onChange={(e) => setFontSize(`${e.target.value}px`)}
            className="form-control"
            style={{ width: "5rem" }}
          />
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="fw-bold fs-5 mx-2">📄 وضع الطباعة:</label>
          <select
            value={breakMode}
            onChange={(e) => setBreakMode(e.target.value)}
            className="form-select"
          >
            <option value="per-question">سؤال في صفحة</option>
            <option value="multi">عدة أسئلة في صفحة</option>
          </select>
        </div>
      </div>

      {/* ✅ عرض الأسئلة */}
      {questions.map((q, index) => (
        <div
          key={q.id}
          className="question-card w-100 p-4 my-5 text-end mx-auto border rounded shadow-sm"
          style={{
            maxWidth: "700px",
            pageBreakAfter: breakMode === "per-question" ? "always" : "auto",
          }}
        >
          <div
            className="mb-4"
            style={{
              color: questionColor,
              fontSize: fontSize,
              lineHeight: "1.8",
            }}
            dangerouslySetInnerHTML={{
              __html: q.content
                ?.replaceAll("@@PLUGINFILE@@", "/images")
                ?.replaceAll(
                  "<img",
                  '<img style="display:block; margin:auto; max-width:100%;"'
                ),
            }}
          />

          <div style={{ fontSize: fontSize }}>
            {q.answers.map((a, i) => (
              <div key={i} className="d-flex align-items-start gap-2 mb-2">
                <img
                  src={`/images/${EnglishLetters[i]}.svg`}
                  alt={arabicLetters[i]}
                  style={{ width: "24px", height: "24px" }}
                />
                <span dangerouslySetInnerHTML={{ __html: a.text }} />
              </div>
            ))}
          </div>

          <p className="text-success fw-bold fs-5 mt-4 text-end">
            الإجابة الصحيحة:{" "}
            {arabicLetters[q.answers.findIndex((a) => a.is_correct === 1)]}
          </p>
        </div>
      ))}
    </div>
  );
};

export default QuestionPrintableView;
