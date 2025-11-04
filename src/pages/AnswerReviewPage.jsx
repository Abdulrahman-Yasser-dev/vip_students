import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const AnswerReviewPage = ({ student }) => {
  const navigate = useNavigate();
  const { category: rawCategoryParam, type } = useParams(); // type: "correct" | "wrong"
  const category = useMemo(
    () => decodeURIComponent(rawCategoryParam || ""),
    [rawCategoryParam]
  );

  // لو الطالب مش متبَعَت من الأب، نجرب نجيبه من localStorage (اختياري)
  const effectiveStudent = useMemo(() => {
    if (student) return student;
    try {
      const saved = localStorage.getItem("student");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [student]);

  const [loading, setLoading] = useState(true);
  const [allQuestions, setAllQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});

  useEffect(() => {
    // حراسة
    if (!effectiveStudent) {
      navigate("/");
      return;
    }
    if (!category || !["correct", "wrong"].includes(type)) {
      navigate("/");
      return;
    }
  }, [effectiveStudent, category, type, navigate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [qsRes, progRes] = await Promise.all([
          axios.post("https://api.alamthal.org/api/questions/by-category", {
            category,
          }),
          axios.get(
            `https://api.alamthal.org/api/student-progress/${
              effectiveStudent.id
            }/${encodeURIComponent(category)}`
          ),
        ]);

        if (cancelled) return;

        setAllQuestions(qsRes?.data?.data || []);
        setUserAnswers(progRes?.data?.user_answers || {});
      } catch (err) {
        console.error("فشل تحميل صفحة المراجعة:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, effectiveStudent?.id]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      const correctIndex = q.answers.findIndex((a) => a.is_correct == 1);
      const ua = userAnswers[q.id];
      if (type === "correct") return ua !== undefined && ua === correctIndex;
      if (type === "wrong") return ua !== undefined && ua !== correctIndex;
      return false;
    });
  }, [allQuestions, userAnswers, type]);

  useEffect(() => {
    // Typeset لو عندك MathJax
    if (!loading && window.MathJax) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [loading, filteredQuestions]);

  if (!effectiveStudent) {
    return null; // هيحوّل فوق
  }

  if (loading) {
    return (
      <div className="bg-dark min-vh-100 text-white d-flex align-items-center justify-content-center p-4">
        <div className="d-flex align-items-center gap-3">
          <div className="spinner-border text-warning" role="status" />
          <span className="fw-bold">جاري تحميل الأسئلة…</span>
        </div>
      </div>
    );
  }

  const arabicType = type === "correct" ? "الأسئلة الصحيحة" : "الأسئلة الخاطئة";

  return (
    <div className="bg-dark min-vh-100 text-white py-4">
      <div className="container">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
          <h3 className="m-0 fw-bold">
            {arabicType} — <span className="text-warning">{category}</span>{" "}
            <small className="text-light opacity-75">
              ({filteredQuestions.length} من {allQuestions.length})
            </small>
          </h3>

          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-light"
              onClick={() => navigate(-1)}
            >
              ⬅ رجوع
            </button>
            <button
              className="btn btn-outline-warning"
              onClick={() =>
                navigate(
                  `/review/${encodeURIComponent(category)}/${
                    type === "correct" ? "wrong" : "correct"
                  }`
                )
              }
            >
              {type === "correct" ? "عرض الخاطئة" : "عرض الصحيحة"}
            </button>
          </div>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="alert alert-info text-dark">
            لا توجد أسئلة {type === "correct" ? "صحيحة" : "خاطئة"} لديك في هذا
            البنك حتى الآن.
          </div>
        ) : (
          <div className="row g-3">
            {filteredQuestions.map((q, idx) => {
              const correctIndex = q.answers.findIndex(
                (a) => a.is_correct == 1
              );
              const ua = userAnswers[q.id];

              return (
                <div className="col-12" key={q.id}>
                  <div className="card bg-secondary text-white shadow-sm border-0">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="badge bg-dark">سؤال #{idx + 1}</span>
                        <span
                          className={`badge ${
                            ua === correctIndex ? "bg-success" : "bg-danger"
                          }`}
                        >
                          {ua === correctIndex ? "صحيح" : "خاطئ"}
                        </span>
                      </div>

                      <div
                        className="mb-3 text-end"
                        dangerouslySetInnerHTML={{
                          __html: q.content
                            ?.replaceAll(
                              "@@PLUGINFILE@@",
                              "https://quiz.alamthal.org/quiz/images"
                            )
                            ?.replaceAll(
                              'src="/quiz/images',
                              'src="https://quiz.alamthal.org/quiz/images'
                            )
                            ?.replaceAll(
                              "<img",
                              '<img style="display:block; margin:auto;"'
                            ),
                        }}
                      />

                      <div className="d-grid gap-2">
                        {q.answers.map((a, i) => {
                          const isCorrect = i === correctIndex;
                          const isUser = ua === i;
                          const cls = isCorrect
                            ? "btn-success"
                            : isUser
                            ? "btn-danger"
                            : "btn-light";
                          const border = isCorrect
                            ? "border-success"
                            : isUser
                            ? "border-danger"
                            : "border-secondary";
                          return (
                            <button
                              key={i}
                              className={`btn text-end fw-bold ${cls} ${border}`}
                              disabled
                              dangerouslySetInnerHTML={{ __html: a.text }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerReviewPage;
