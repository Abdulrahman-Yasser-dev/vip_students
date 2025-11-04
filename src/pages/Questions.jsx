import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Result from "./Result";
import { useNavigate } from "react-router-dom";
import Timer from "../components/Timer";
import useCategoriesSummary from "../hooks/useCategoriesSummary";

/* ===================== API + Hooks + Small Components ===================== */
const API_BASE = "https://api.alamthal.org/api";
export const api = {
  getCategories: () => axios.get(`${API_BASE}/question-categories`),
  getCategoriesSummary: (studentId) =>
    axios.get(`${API_BASE}/categories-summary/${studentId}`),
  getQuestionsByCategory: (category) =>
    axios.post(`${API_BASE}/questions/by-category`, { category }),
  getProgress: (studentId, category) =>
    axios.get(
      `${API_BASE}/student-progress/${studentId}/${encodeURIComponent(
        category
      )}`
    ),
  saveProgress: (payload) =>
    axios.post(`${API_BASE}/student-progress`, payload),
  reportQuestion: (payload) =>
    axios.post(`${API_BASE}/report-question`, payload),
};

const useFakeProgress = (loading, { max = 95, step = 5, delay = 100 } = {}) => {
  const [progress, setProgress] = React.useState(0);
  useEffect(() => {
    if (!loading) {
      setProgress(100);
      return;
    }
    let value = 0;
    const interval = setInterval(() => {
      value += step;
      setProgress((prev) => (prev < max ? value : max));
    }, delay);
    return () => clearInterval(interval);
  }, [loading, max, step, delay]);
  return progress;
};

const useMathJax = () => {
  useEffect(() => {
    const runTypeset = () => {
      if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetClear();
        window.MathJax.typesetPromise();
      } else if (window.MathJax?.Hub) {
        // fallback لو شغال v2
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
      }
    };

    // شغل typeset بعد كل render
    runTypeset();
  }); // 👈 متسيبهاش فاضية من غير deps = تشتغل بعد كل render
};

const Drawer = ({
  open,
  title,
  color,
  ids,
  currentQuestions,
  onClose,
  onJump,
}) => {
  return (
    <div
      className={`position-fixed top-0 end-0 h-100 bg-white shadow-lg transition-all`}
      style={{
        width: open ? "300px" : "0",
        overflowX: "hidden",
        transition: "width 0.3s ease-in-out",
        zIndex: 2000,
      }}
    >
      <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
        <h5 className="m-0 fw-bold" style={{ color }}>
          {title}
        </h5>
        <button className="btn-close" onClick={onClose}></button>
      </div>

      <div
        className="p-3"
        style={{ overflowY: "auto", height: "calc(100% - 56px)" }}
      >
        <div className="d-flex flex-wrap gap-2">
          {ids.map((qid) => {
            const index = currentQuestions.findIndex((q) => q.id === qid);
            if (index === -1) return null;
            return (
              <button
                key={qid}
                onClick={() => onJump(index)}
                className="btn btn-sm rounded-circle"
                style={{
                  backgroundColor: color,
                  color: "white",
                  width: "35px",
                  height: "35px",
                  fontWeight: "bold",
                }}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ReportModal = ({
  show,
  onClose,
  onSubmit,
  questionNumber,
  reportText,
  setReportText,
}) => {
  if (!show) return null;
  return (
    <div
      className="modal fade show"
      style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">الإبلاغ عن خطأ</h5>
          </div>
          <div className="modal-body">
            <p>
              <strong>السؤال رقم:</strong> {questionNumber}
            </p>
            <div className="mb-3">
              <label className="form-label">ملاحظتك</label>
              <textarea
                className="form-control"
                rows="4"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              إلغاء
            </button>
            <button className="btn btn-danger" onClick={onSubmit}>
              إرسال البلاغ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ======================= Helpers: Subset Logic ======================= */

// أول سؤال غير مُجاب داخل subset
const getFirstUnansweredIndex = (arrQ, answers) => {
  const ix = arrQ.findIndex((q) => answers[q.id] === undefined);
  return ix === -1 ? 0 : ix;
};

/* =============== Persist selected subset per (student, category) =============== */
const sessionKey = (studentId, category) =>
  `quiz_sess_${studentId}_${encodeURIComponent(category)}`;

const loadSession = (studentId, category) => {
  try {
    const raw = localStorage.getItem(sessionKey(studentId, category));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveSession = (studentId, category, data) => {
  try {
    const prev = loadSession(studentId, category) || {};
    localStorage.setItem(
      sessionKey(studentId, category),
      JSON.stringify({ ...prev, ...data })
    );
  } catch {}
};

const clearSession = (studentId, category) => {
  try {
    localStorage.removeItem(sessionKey(studentId, category));
  } catch {}
};

/** يبني subset ثابت:
 * - لو فيه ids محفوظة → رجّع نفس الأسئلة بنفس الترتيب
 * - لو مفيش → اعمل اختيار عشوائي (slice + shuffle) حسب العدد المطلوب
 */
const buildSelectedQuestions = (allQ, num, savedIds) => {
  if (Array.isArray(savedIds) && savedIds.length) {
    const byId = new Map(allQ.map((q) => [q.id, q]));
    const list = savedIds.map((id) => byId.get(id)).filter(Boolean);
    if (list.length) return list;
  }
  let selected = allQ;
  if (num < allQ.length) {
    selected = [...allQ].sort(() => 0.5 - Math.random()).slice(0, num);
  }
  return selected;
};

/* ======================================================================== */

const Questions = ({ student }) => {
  const [allQuestions, setAllQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [currentQuestions, setCurrentQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [loading, setLoading] = useState(true);
  const progress = useFakeProgress(loading);

  const [stage, setStage] = useState("chooseCategory");
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [answeredQuestionId, setAnsweredQuestionId] = useState(null);
  const [categoryStats, setCategoryStats] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState("");

  const [showWrongPopup, setShowWrongPopup] = useState(false);
  const [showCorrectPopup, setShowCorrectPopup] = useState(false);

  const [savedUserAnswers, setSavedUserAnswers] = useState({});
  const [finalizedQuestions, setFinalizedQuestions] = useState([]);

  const [filter, setFilter] = useState("all");
  const [previousIndex, setPreviousIndex] = useState(null);
  const [lastSolveIndex, setLastSolveIndex] = useState(null);
  const [inSection, setInSection] = useState(false);
  const [highlightColor, setHighlightColor] = useState("");
  const [highlightedAnswer, setHighlightedAnswer] = useState(null);
  const [numQuestionsByCategory, setNumQuestionsByCategory] = useState({});
  const [showSolution, setShowSolution] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (!student) {
      navigate("/");
      return;
    }
    fetchData();
  }, []);

  const saveProgress = async (current_index, answers) => {
    try {
      // حفظ محلي للجلسة
      saveSession(student.id, selectedCategory, {
        currentQuestionId: currentQuestions[current_index]?.id ?? null,
      });

      await api.saveProgress({
        student_id: student.id,
        category: selectedCategory,
        current_index: Math.max(0, current_index),
        user_answers: answers,
      });

      // ✅ تحديث الإحصائيات بعد الحفظ
      refetch();
    } catch (error) {
      console.error("خطأ في حفظ التقدم", error);
    }
  };

  const sendReport = async () => {
    if (!reportText.trim()) {
      alert("من فضلك اكتب تفاصيل البلاغ");
      return;
    }
    try {
      const q = currentQuestions[currentIndex];
      if (!q) {
        alert("لم يتم العثور على السؤال الحالي");
        return;
      }
      await api.reportQuestion({
        student_id: student.id,
        student_name: student.name,
        student_phone: student.phone,
        question_id: q.id,
        question_number: currentIndex + 1,
        message: reportText,
      });
      alert("✅ تم إرسال البلاغ بنجاح");
      setShowReportModal(false);
      setReportText("");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إرسال البلاغ");
    }
  };

  // ✅ الصحيح: احسب على subset الحالي فقط
  const wrongQuestionsMemo = React.useMemo(() => {
    return currentQuestions
      .filter((q) => finalizedQuestions.includes(q.id))
      .filter((q) => {
        const correctIndex = q.answers.findIndex((a) => a.is_correct == 1);
        const ua = userAnswers[q.id];
        return (
          ua === undefined || ua === null || parseInt(ua, 10) !== correctIndex
        );
      })
      .map((q) => q.id);
  }, [currentQuestions, finalizedQuestions, userAnswers]);

  const correctQuestionsMemo = React.useMemo(() => {
    return currentQuestions
      .filter((q) => {
        const correctIndex = q.answers.findIndex((a) => a.is_correct == 1);
        return userAnswers[q.id] === correctIndex;
      })
      .map((q) => q.id);
  }, [currentQuestions, userAnswers]);

  const resetTest = async (category, numQuestions) => {
    console.log("🔁 Reset called with:", category, numQuestions);

    setSelectedCategory(category);
    setLoading(true);

    try {
      // جلب كل الأسئلة
      const res = await api.getQuestionsByCategory(category);
      const allQ = res.data.data || [];

      // بناء subset جديد بنفس العدد المطلوب
      const selectedQ = buildSelectedQuestions(allQ, numQuestions, null);
      const selectedIds = selectedQ.map((q) => q.id);

      // تصفير الجلسة
      saveSession(student.id, category, {
        ids: selectedIds,
        currentQuestionId: selectedQ[0]?.id ?? null,
      });

      // تصفير التقدم في الباك إند
      await api.saveProgress({
        student_id: student.id,
        category,
        current_index: 0,
        user_answers: {},
      });

      // تحديث الحالة
      setAllQuestions(allQ);
      setCurrentQuestions(selectedQ);
      setCurrentIndex(0);
      setUserAnswers({});
      setSavedUserAnswers({});
      setFinalizedQuestions([]);
      setAnsweredQuestionId(null);

      await refetch();
      // ✅ نرجّع الطالب لمرحلة intro
      setStage("intro");
    } catch (err) {
      console.error("خطأ في إعادة الاختبار", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب قائمة البنوك
      const categoriesRes = await api.getCategories();
      const cats = categoriesRes.data;

      // جلب عدد الأسئلة لكل بنك
      const categoriesWithCount = await Promise.all(
        cats.map(async (cat) => {
          try {
            const res = await api.getQuestionsByCategory(cat);
            return { name: cat, totalQuestions: res.data.data.length };
          } catch {
            return { name: cat, totalQuestions: 0 };
          }
        })
      );
      setCategories(categoriesWithCount);

      // جلب تقدم الطالب لكل بنك
      const progressResults = await Promise.all(
        cats.map(async (cat) => {
          try {
            const progressRes = await api.getProgress(student.id, cat);
            const {
              user_answers = {},
              total_correct = 0,
              total_incorrect = 0,
            } = progressRes.data;
            return {
              cat,
              stats: {
                answered: Object.keys(user_answers).length,
                correct: total_correct,
                incorrect: total_incorrect,
              },
            };
          } catch {
            return { cat, stats: { answered: 0, correct: 0, incorrect: 0 } };
          }
        })
      );

      const stats = {};
      progressResults.forEach(({ cat, stats: s }) => {
        stats[cat] = s;
      });
      setCategoryStats(stats);

      setLoading(false);
      setStage("chooseCategory");
    } catch (err) {
      console.error("خطأ في تحميل البيانات", err);
      setLoading(false);
    }
  };

  function shuffleArray(array) {
    return array
      .map((a) => ({ sort: Math.random(), value: a }))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.value);
  }

  const loadQuestionsByCategory = async (category, numQuestions) => {
    setSelectedCategory(category);
    setLoading(true);

    try {
      // 1) هات كل الأسئلة
      const res = await api.getQuestionsByCategory(category);
      const allQ = res.data.data || [];
      if (!allQ.length) {
        alert(`⚠️ لا توجد أسئلة لبنك الأسئلة: ${category}`);
        setLoading(false);
        return;
      }

      // 2) هات التقدّم (علشان نعرف المحلول)
      let answersObj = {};
      try {
        const progressRes = await api.getProgress(student.id, category);
        answersObj = progressRes?.data?.user_answers || {};
        setUserAnswers(answersObj);
        setSavedUserAnswers(answersObj);
        setFinalizedQuestions(
          Object.keys(answersObj).map((id) => parseInt(id, 10))
        );
      } catch (err) {
        if (err?.response?.status === 404) {
          setUserAnswers({});
          setSavedUserAnswers({});
          setFinalizedQuestions([]);
        } else {
          console.error("فشل في جلب التقدم حسب التصنيف", err);
        }
      }

      const solvedIds = Object.keys(answersObj).map((id) => parseInt(id, 10));
      const sess = loadSession(student.id, category);
      let selectedIds = [];

      // 🔀 Helper: Shuffle
      const shuffleArray = (array) =>
        array
          .map((a) => ({ sort: Math.random(), value: a }))
          .sort((a, b) => a.sort - b.sort)
          .map((a) => a.value);

      // ✅ الأسئلة غير المحلولة فقط
      const unsolved = allQ.filter((q) => !solvedIds.includes(q.id));

      if (unsolved.length >= numQuestions) {
        // لو المتبقي يكفي → اختار منهم عشوائي
        selectedIds = shuffleArray(unsolved)
          .slice(0, numQuestions)
          .map((q) => q.id);
      } else if (unsolved.length > 0) {
        // لو المتبقي أقل من المطلوب → هاته كله
        selectedIds = unsolved.map((q) => q.id);
      } else {
        // ✅ كله متحل → اختار N عشوائي من الكل
        selectedIds = shuffleArray(allQ)
          .slice(0, numQuestions)
          .map((q) => q.id);
      }

      // 3) ابن subset الفعلي
      const selectedQ = selectedIds
        .map((id) => allQ.find((q) => q.id === id))
        .filter(Boolean);

      if (!selectedQ.length) {
        alert("⚠️ لا توجد أسئلة متاحة بالعدد المطلوب");
        setLoading(false);
        return;
      }

      // 4) حدّد نقطة البداية
      let currentQuestionId = sess?.currentQuestionId;
      if (!currentQuestionId || !selectedIds.includes(currentQuestionId)) {
        const startIx = getFirstUnansweredIndex(selectedQ, answersObj);
        currentQuestionId = selectedQ[startIx]?.id ?? selectedQ[0]?.id ?? null;
      }
      const ix = selectedQ.findIndex((q) => q.id === currentQuestionId);

      // 5) خزّن السيشن الجديدة
      saveSession(student.id, category, {
        ids: selectedIds,
        currentQuestionId: currentQuestionId,
      });

      // 6) حدّث الحالة
      setAllQuestions(allQ);
      setCurrentQuestions(selectedQ);
      setCurrentIndex(ix === -1 ? 0 : ix);
      setAnsweredQuestionId(null);

      if (window.MathJax && window.MathJax.Hub) {
        window.MathJax.Hub.Queue([
          "Typeset",
          window.MathJax.Hub,
          () => setTimeout(() => setLoading(false), 300),
        ]);
      } else {
        setLoading(false);
      }

      setStage("intro");
    } catch (err) {
      console.error("فشل في جلب الأسئلة حسب التصنيف", err);
      setLoading(false);
    }
  };

  const handleOpenQuestion = (index) => {
    setCurrentIndex(index);
    setInSection(false);
  };

  const handleBackToMyPlace = () => {
    const sess = loadSession(student.id, selectedCategory);

    if (sess?.currentQuestionId) {
      const ix = currentQuestions.findIndex(
        (q) => q.id === sess.currentQuestionId
      );
      setCurrentIndex(ix === -1 ? 0 : ix);
      setStage("exam");
    } else if (lastSolveIndex !== null) {
      setCurrentIndex(lastSolveIndex);
      setInSection(true);
      setStage("exam");
    }
  };

  // MathJax فقط عند تغييرات مهمة
  useMathJax();

  useEffect(() => {
    if (!student || !selectedCategory) return;
    const key = `finalized_${student.id}_${selectedCategory}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setFinalizedQuestions(JSON.parse(saved));
      } catch (e) {
        setFinalizedQuestions([]);
      }
    } else {
      setFinalizedQuestions([]);
    }
  }, [student, selectedCategory]);

  useEffect(() => {
    if (!student || !selectedCategory) return;
    const key = `finalized_${student.id}_${selectedCategory}`;
    localStorage.setItem(key, JSON.stringify(finalizedQuestions));
  }, [finalizedQuestions, student, selectedCategory]);

  const {
    data: categoriesSummary,
    isLoading,
    refetch,
  } = useCategoriesSummary(student?.id);

  if (!student) {
    return (
      <div className="bg-dark min-vh-100 text-white d-flex align-items-center justify-content-center flex-column p-4">
        <p>جاري تحميل بيانات الطالب...</p>
      </div>
    );
  }
  /* ============================ UI: Loading ============================ */

  if (loading) {
    return (
      <div className="bg-dark min-vh-100 text-white d-flex align-items-center justify-content-center flex-column p-4">
        <div className="w-100" style={{ maxWidth: "500px" }}>
          <div
            className="progress mb-4 rounded-pill"
            style={{ height: "24px", direction: "ltr" }}
          >
            <div
              className="progress-bar bg-warning progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ width: `${progress}%` }}
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
          <p className="text-center text-warning fw-bold fs-5">
            استعد، جاري تجهيز اختبارك الآن... ({progress}%) 🚀
          </p>
        </div>
      </div>
    );
  }

  /* ============================ Stages ============================ */
  if (stage === "chooseCategory") {
    const verbalCategories = [
      "اللفظي",
      "استيعاب المقروء",
      "التناظر اللفظي",
      "الخطأ السياقي",
      "الارتباط والاختلاف",
      "إكمال الجمل",
      "الكلمة الشاذة",
    ];

    if (isLoading) {
      return (
        <div className="min-vh-100 d-flex justify-content-center align-items-center">
          <p className="text-primary fw-bold fs-4">⏳ جاري تحميل البنوك...</p>
        </div>
      );
    }

    const filteredCategories = categoriesSummary.filter((cat) => {
      if (filter === "verbal") return verbalCategories.includes(cat.category);
      if (filter === "quant") return !verbalCategories.includes(cat.category);
      return true;
    });

    return (
      <div
        className="min-vh-100 py-5 px-3"
        style={{
          background: "linear-gradient(135deg, #e0f7fa 0%, #ffffff 100%)",
        }}
      >
        <div className="container">
          <h2 className="text-center mb-5 fw-bold text-warning display-5">
            🎯 اختر بنك الأسئلة
          </h2>

          {/* أزرار الفلترة */}
          <div className="d-flex justify-content-center gap-3 mb-5 flex-wrap">
            <button
              className={`btn ${
                filter === "all" ? "btn-primary" : "btn-outline-primary"
              } px-4 py-2 rounded-pill shadow-sm`}
              onClick={() => setFilter("all")}
            >
              الكل
            </button>
            <button
              className={`btn ${
                filter === "verbal" ? "btn-success" : "btn-outline-success"
              } px-4 py-2 rounded-pill shadow-sm`}
              onClick={() => setFilter("verbal")}
            >
              لفظي
            </button>
            <button
              className={`btn ${
                filter === "quant" ? "btn-warning" : "btn-outline-warning"
              } px-4 py-2 rounded-pill shadow-sm`}
              onClick={() => setFilter("quant")}
            >
              كمي
            </button>
          </div>

          {/* كروت الفئات */}
          <div className="row g-4 justify-content-center">
            {filteredCategories.map((cat) => {
              const { category, totalQuestions, answered, correct, incorrect } =
                cat;
              const remaining = totalQuestions - answered;
              const hasStarted = answered > 0;

              return (
                <div className="col-12 col-md-6 col-lg-4" key={category}>
                  <div className="card bg-white text-dark shadow-lg border-0 h-100 rounded-4">
                    <div className="card-body text-center p-4">
                      <h5 className="card-title fw-bold fs-5 mt-3 mb-2">
                        {category}
                      </h5>
                      <p className="text-secondary small mb-3">
                        عدد الأسئلة في هذا البنك: {totalQuestions}
                      </p>

                      <div className="d-flex justify-content-center gap-2 flex-wrap mt-3 mb-3">
                        <span
                          className="badge bg-success fw-semibold px-3 py-2"
                          role="button"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/review/${encodeURIComponent(category)}/correct`
                            );
                          }}
                        >
                          ✅ صحيح: {correct}
                        </span>
                        <span
                          className="badge bg-danger fw-semibold px-3 py-2"
                          role="button"
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/review/${encodeURIComponent(category)}/wrong`
                            );
                          }}
                        >
                          ❌ خطأ: {incorrect}
                        </span>
                        <span className="badge bg-warning text-dark fw-semibold px-3 py-2">
                          📝 المتبقي: {remaining}
                        </span>
                      </div>

                      {/* input لتحديد عدد الأسئلة */}
                      <div className="mb-3">
                        <label className="form-label">
                          عدد الأسئلة التي تريد حلها:
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          max={totalQuestions}
                          value={
                            numQuestionsByCategory[category] || totalQuestions
                          }
                          onChange={(e) =>
                            setNumQuestionsByCategory((prev) => ({
                              ...prev,
                              [category]: Number(e.target.value),
                            }))
                          }
                        />
                      </div>

                      <div className="d-flex justify-content-center gap-3 flex-wrap mt-3">
                        <button
                          className="btn btn-warning px-4 py-2 shadow-sm"
                          onClick={() => {
                            const numQuestions =
                              numQuestionsByCategory[category] ||
                              totalQuestions;

                            if (!hasStarted) {
                              clearSession(student.id, category);
                            }

                            loadQuestionsByCategory(category, numQuestions);
                          }}
                        >
                          {hasStarted ? "اكمل الاختبار" : "ابدأ الاختبار"}
                        </button>

                        <button
                          className="btn btn-outline-danger px-4 py-2 shadow-sm"
                          onClick={() => {
                            const numQuestions =
                              numQuestionsByCategory[category] ||
                              totalQuestions;
                            resetTest(category, numQuestions);
                          }}
                        >
                          إعادة الاختبار
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "intro") {
    return (
      <div className="text-center d-flex justify-content-center align-items-center flex-column p-4 text-white bg-dark min-vh-100">
        <h1 className="fs-3 fw-bold mb-4">
          📝 الاختبار يتكون من {currentQuestions.length} سؤال
        </h1>
        <button
          className="btn btn-warning fw-bold px-4 py-2"
          onClick={() => setStage("quiz")}
        >
          🚀 ابدأ الاختبار
        </button>
      </div>
    );
  }

  if (stage === "review") {
    return (
      <div className="bg-dark min-vh-100 d-flex flex-column text-white">
        {/* HEADER */}
        <div className="container py-5 text-center">
          <h2 className="fw-bold text-warning mb-3 fs-2">📋 مراجعة الأسئلة</h2>
          <p className="text-secondary">تابع تقدمك واختر أي سؤال للرجوع إليه</p>
        </div>

        {/* GRID */}
        <div className="container flex-grow-1">
          <div className="row g-4 justify-content-center">
            {currentQuestions.map((q, i) => {
              const isAnswered = userAnswers[q.id] !== undefined;

              return (
                <div key={q.id} className="col-6 col-md-4 col-lg-3">
                  <div
                    className="card shadow-sm h-100 text-center border-0"
                    style={{
                      background: isAnswered ? "#198754" : "#6c757d",
                      color: "white",
                      cursor: "pointer",
                      borderRadius: "12px",
                      transition: "0.3s",
                    }}
                    onClick={() => {
                      setCurrentIndex(i);
                      setStage("reviewQuestion");
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = "translateY(-6px)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = "translateY(0)")
                    }
                  >
                    <div className="card-body d-flex flex-column justify-content-center">
                      <h5 className="fw-bold mb-2">سؤال {i + 1}</h5>
                      {isAnswered ? (
                        <span className="badge bg-success px-3 py-2">تم</span>
                      ) : (
                        <span className="badge bg-secondary px-3 py-2">
                          لم يتم
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-top border-secondary mt-5 py-4">
          <div className="container d-flex justify-content-center gap-3 flex-wrap">
            <button
              onClick={() => setStage("result")}
              className="btn btn-warning fw-bold px-4 py-2 shadow-sm"
            >
              🏁 عرض النتيجة
            </button>

            <button
              onClick={() => setStage("reviewAll")}
              className="btn btn-outline-light fw-bold px-4 py-2 shadow-sm"
            >
              📖 مراجعة الكل
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "reviewAll") {
    return (
      <div className="bg-dark min-vh-100 text-white p-4">
        <h2 className="mb-4">📋 مراجعة كل الأسئلة</h2>
        {currentQuestions.map((q, idx) => {
          const correctAnswerIndex = q.answers.findIndex(
            (a) => a.is_correct == 1
          );
          const selectedAnswerIndex = userAnswers[q.id];

          return (
            <div key={q.id} className="mb-4 p-3 bg-secondary rounded">
              <h5 className="mb-3">سؤال {idx + 1}</h5>
              {(() => {
                const fixedContent = q.content
                  ?.replaceAll("@@PLUGINFILE@@", "/images")
                  ?.replaceAll(
                    'src="/quiz/images',
                    'src="https://quiz.alamthal.org/quiz/images'
                  )
                  ?.replaceAll(
                    'src="/images',
                    'src="https://quiz.alamthal.org/quiz/images'
                  );

                return (
                  <div
                    className="mb-3"
                    dangerouslySetInnerHTML={{ __html: fixedContent }}
                  />
                );
              })()}

              {q.answers.map((a, i) => {
                const isCorrect = i === correctAnswerIndex;
                const isSelected = i === selectedAnswerIndex;

                let btnClass = "btn w-100 mb-2 text-end fw-bold ";
                if (isCorrect) btnClass += "btn-success";
                else if (isSelected && !isCorrect) btnClass += "btn-danger";
                else btnClass += "btn-light text-dark";

                return (
                  <button
                    key={i}
                    className={btnClass}
                    disabled
                    dangerouslySetInnerHTML={{ __html: a.text }}
                  />
                );
              })}
            </div>
          );
        })}
        <button
          className="btn btn-warning mt-4"
          onClick={() => setStage("review")}
        >
          ⬅ الرجوع لقائمة المراجعة
        </button>
      </div>
    );
  }

  if (stage === "reviewQuestion") {
    const current = currentQuestions[currentIndex];
    const correctAnswerIndex = current.answers.findIndex(
      (a) => a.is_correct == 1
    );
    const selectedAnswerIndex = userAnswers[current.id];

    return (
      <div className="bg-dark min-vh-100 text-white p-4">
        <h4 className="mb-4">مراجعة السؤال {currentIndex + 1}</h4>
        {(() => {
          const fixedContent = current.content
            ?.replaceAll("@@PLUGINFILE@@", "/images")
            ?.replaceAll(
              'src="/quiz/images',
              'src="https://quiz.alamthal.org/quiz/images'
            )
            ?.replaceAll(
              'src="/images',
              'src="https://quiz.alamthal.org/quiz/images'
            );

          return (
            <div
              className="p-3 mb-4 bg-secondary rounded"
              dangerouslySetInnerHTML={{ __html: fixedContent }}
            />
          );
        })()}

        {current.answers.map((a, i) => {
          const isCorrect = i === correctAnswerIndex;
          const isSelected = i === selectedAnswerIndex;

          let btnClass = "btn w-100 mb-2 text-end fw-bold ";
          if (isCorrect) btnClass += "btn-success";
          else if (isSelected && !isCorrect) btnClass += "btn-danger";
          else btnClass += "btn-light text-dark";

          return (
            <button
              key={i}
              className={btnClass}
              disabled
              dangerouslySetInnerHTML={{ __html: a.text }}
            />
          );
        })}
        <div className="mt-4">
          <button
            className="btn btn-warning"
            onClick={() => setStage("review")}
          >
            ⬅ الرجوع لقائمة الأسئلة
          </button>
        </div>
      </div>
    );
  }

  if (stage === "result") {
    return (
      <div className="bg-dark min-vh-100 d-flex flex-column justify-content-center align-items-center text-white py-5 px-3">
        <div
          className="text-center"
          style={{ maxWidth: "800px", width: "100%" }}
        >
          {/* ✅ نتيجة الطالب */}
          <Result
            questions={currentQuestions}
            userAnswers={userAnswers}
            student={student}
            onRestart={resetTest}
            selectedCategory={selectedCategory}
            currentQuestions={currentQuestions}
          />

          {/* ✅ زر الرجوع */}
          <div className="mt-4">
            <button
              className="btn btn-warning fw-bold px-5 py-2 shadow-sm text-dark"
              onClick={() => setStage("chooseCategory")}
            >
              ⬅ الرجوع لصفحة اختيار البنوك
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ====== Stage: inSection (الاختبار) ======
  const current = currentQuestions[currentIndex];

  const handleAnswer = (questionId, answerIndex) => {
    if (
      userAnswers[questionId] !== undefined ||
      finalizedQuestions.includes(questionId)
    ) {
      return;
    }

    const updatedAnswers = { ...userAnswers, [questionId]: answerIndex };
    setUserAnswers(updatedAnswers); // <-- الطالب يشوف الإجابة لحظيًا

    saveProgress(currentIndex, updatedAnswers).catch((err) => {
      console.error("فشل حفظ التقدم:", err);
    });

    setAnsweredQuestionId(questionId);

    setFinalizedQuestions((prev) => {
      if (!prev.includes(questionId)) {
        return [...prev, questionId];
      }
      return prev;
    });
  };

  const goNext = () => {
    const currentQuestion = currentQuestions[currentIndex];

    if (!answeredQuestionId) {
      setAnsweredQuestionId(currentQuestion.id);

      setFinalizedQuestions((prev) => {
        if (!prev.includes(currentQuestion.id)) {
          return [...prev, currentQuestion.id];
        }
        return prev;
      });

      // ثبّت مكان الوقوف في الجلسة
      saveSession(student.id, selectedCategory, {
        currentQuestionId: currentQuestion.id,
      });

      return;
    }

    if (currentIndex < currentQuestions.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextQ = currentQuestions[nextIndex];
      setCurrentIndex(nextIndex);
      if (inSection) setLastSolveIndex(nextIndex);

      // حدّث الجلسة + إحفظ للباك إند
      saveSession(student.id, selectedCategory, {
        currentQuestionId: nextQ.id,
      });
      saveProgress(nextIndex, userAnswers); // ✅ التعديل هنا

      setAnsweredQuestionId(null);
    } else {
      setStage("review");
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevQ = currentQuestions[prevIndex];
      setCurrentIndex(prevIndex);
      setAnsweredQuestionId(null);

      saveSession(student.id, selectedCategory, {
        currentQuestionId: prevQ.id,
      });
      // اختياري: حفظ تقدّم عند الرجوع
      // saveProgress(prevQ.id, userAnswers);
    }
  };

  return (
    <div className="bg-light min-vh-100 p-3 p-md-4">
      <div
        className="card shadow-lg border-0 rounded-4 mx-auto"
        style={{ maxWidth: "800px" }}
      >
        <div
          className="card-header bg-light border-0 shadow-sm py-4 px-4"
          style={{
            borderBottom: "3px solid #ffc107", // خط تحت الهيدر أصفر
          }}
        >
          <div className="row align-items-center text-center text-md-start">
            {/* اسم البنك */}
            <div className="col-md-4 fw-bold text-md-start">
              <span
                className="text-warning"
                style={{ fontSize: "2rem", fontWeight: "900" }} // تكبير الخط
              >
                {selectedCategory || "—"}
              </span>
            </div>

            {/* رقم السؤال */}
            <div
              className="col-md-4 my-2 my-md-0 text-center fw-bold"
              style={{ color: "#333", fontSize: "1.1rem" }}
            >
              السؤال {currentIndex + 1} من {currentQuestions.length}
            </div>

            {/* التايمر */}
            <div className="col-md-4 text-md-end">
              <Timer
                durationInSeconds={600}
                startTime={Date.now()}
                onTimeout={() => setStage("review")}
                currentIndex={currentIndex}
                currentQuestions={currentQuestions}
              />
            </div>
          </div>
        </div>

        {/* جسم السؤال */}
        <div className="card-body p-4">
          <div className="mb-3 fs-5 border-bottom pb-3 text-center">
            <div
              dangerouslySetInnerHTML={{
                __html: current?.content
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
                    '<img class="img-fluid d-block mx-auto"'
                  ),
              }}
            />
          </div>

          {/* الإجابات */}
          <div className="d-grid gap-2">
            {current?.answers?.map((a, i) => {
              const correctAnswerIndex = current.answers.findIndex(
                (ans) => ans.is_correct == 1
              );
              const isCorrectAnswer = i === correctAnswerIndex;
              const isSelected = userAnswers[current.id] === i;
              const answeredBefore =
                userAnswers[current.id] !== undefined ||
                finalizedQuestions.includes(current.id);

              let btnClass =
                "btn text-end fw-semibold shadow-sm rounded-3 px-3 py-2 answer-btn";

              let extraStyle = {};

              if (answeredBefore) {
                if (isCorrectAnswer) {
                  btnClass += " text-dark";
                  extraStyle = {
                    backgroundColor: "#d4edda", // أخضر فاتح
                    border: "2px solid #28a745", // أخضر غامق
                    color: "#155724",
                  };
                } else if (isSelected && !isCorrectAnswer) {
                  btnClass += " text-dark";
                  extraStyle = {
                    backgroundColor: "#f8d7da", // أحمر فاتح
                    border: "2px solid #dc3545", // أحمر غامق
                    color: "#721c24",
                  };
                } else {
                  btnClass += " btn-light";
                  extraStyle = {
                    border: "2px solid #e2e8f0", // ✅ البوردر الجديد
                  };
                }
              } else {
                btnClass += " btn-outline-secondary";
                extraStyle = {
                  border: "2px solid #e2e8f0", // ✅ نفس اللون
                };
              }

              return (
                <button
                  key={i}
                  dir="rtl"
                  onClick={() => {
                    if (!answeredBefore) {
                      setHighlightedAnswer(i);
                      setHighlightColor("bg-warning");
                      setTimeout(() => {
                        handleAnswer(current.id, i);
                        setHighlightColor(
                          isCorrectAnswer
                            ? "highlight-correct"
                            : "highlight-wrong"
                        );
                        setTimeout(() => {
                          setHighlightColor("");
                          setHighlightedAnswer(null);
                        }, 800);
                      }, 800);
                    }
                  }}
                  onMouseUp={(e) => e.currentTarget.blur()}
                  onTouchEnd={(e) => e.currentTarget.blur()}
                  className={`${btnClass} ${answeredBefore ? "no-hover" : ""} ${
                    highlightedAnswer === i ? highlightColor : ""
                  }`}
                  disabled={answeredBefore}
                  style={{ fontSize: "0.95rem", ...extraStyle }}
                  dangerouslySetInnerHTML={{ __html: a.text }}
                />
              );
            })}
          </div>

          {/* ✅ طريقة الحل Dropdown بشكل أنيق */}
          {userAnswers[current.id] !== undefined && current?.solution && (
            <div className="mt-4">
              <button
                className="btn btn-warning w-100 fw-bold d-flex justify-content-between align-items-center rounded-3 shadow-sm"
                style={{
                  fontSize: "1rem",
                  padding: "10px 16px",
                }}
                type="button"
                onClick={() =>
                  setShowSolution((prev) =>
                    prev === current.id ? null : current.id
                  )
                }
              >
                <span>طريقة الحل</span>
                <span
                  style={{
                    transition: "transform 0.3s",
                    transform:
                      showSolution === current.id
                        ? "rotate(180deg)"
                        : "rotate(0)",
                  }}
                >
                  ▼
                </span>
              </button>

              {showSolution === current.id && (
                <div
                  className="mt-3 p-3 rounded-3 shadow-sm"
                  style={{
                    background: "#f9f9f9",
                    border: "1px solid black",
                    animation: "fadeIn 0.4s ease-in-out",
                  }}
                >
                  <h6 className="fw-bold text-black mb-3">📘 الشرح:</h6>
                  <div
                    className="text-dark"
                    style={{ lineHeight: "1.7", fontSize: "0.95rem" }}
                    dangerouslySetInnerHTML={{
                      __html: current.solution
                        ?.replaceAll("@@PLUGINFILE@@", "/images")
                        ?.replaceAll(
                          "<img",
                          '<img class="img-fluid d-block mx-auto"'
                        ),
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* الفوتر */}
      <div
        className="mt-3 p-3 bg-light d-flex flex-wrap justify-content-between gap-2 align-items-center"
        style={{
          borderRadius: "8px",
          maxWidth: "800px",
          margin: "0 auto",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        <button
          onClick={goPrev}
          disabled={currentIndex <= 0}
          className="btn btn-dark fw-semibold px-4 flex-fill flex-md-auto"
        >
          السابق
        </button>

        {/* ✅❌ الشكل الجديد للصح والغلط */}
        <div className="d-flex gap-3 flex-fill flex-md-auto justify-content-center">
          <div
            role="button"
            onClick={() => {
              setShowCorrectPopup(true);
              setInSection(false);
            }}
            className="d-flex flex-column justify-content-center align-items-center fw-bold rounded-3"
            style={{
              backgroundColor: "#d4edda", // أخضر فاتح
              border: "2px solid #28a745",
              color: "#155724",
              width: "60px",
              height: "60px",
            }}
          >
            <div style={{ fontSize: "1.2rem", lineHeight: "1" }}>
              {correctQuestionsMemo.length}
            </div>
            <div style={{ fontSize: "0.9rem", lineHeight: "1" }}>صح</div>
          </div>

          <div
            role="button"
            onClick={() => {
              setShowWrongPopup(true);
              setInSection(false);
            }}
            className="d-flex flex-column justify-content-center align-items-center fw-bold rounded-3"
            style={{
              backgroundColor: "#f8d7da", // أحمر فاتح
              border: "2px solid #dc3545",
              color: "#721c24",
              width: "60px",
              height: "60px",
            }}
          >
            <div style={{ fontSize: "1.2rem", lineHeight: "1" }}>
              {wrongQuestionsMemo.length}
            </div>
            <div style={{ fontSize: "0.9rem", lineHeight: "1" }}>خطأ</div>
          </div>
        </div>

        <button
          onClick={goNext}
          className="btn btn-dark fw-semibold px-4 flex-fill flex-md-auto"
          disabled={userAnswers[current.id] === undefined}
        >
          التالي
        </button>
      </div>

      {/* زر رجوع لمكاني */}
      {inSection &&
        loadSession(student.id, selectedCategory)?.currentQuestionId && (
          <div className="text-center mt-3">
            <button
              onClick={() => {
                handleBackToMyPlace();
                setInSection(false);
              }}
              className="btn btn-warning px-4 py-2 fw-semibold"
            >
              رجوع لمكاني
            </button>
          </div>
        )}

      {/* زر إنهاء التدريب + زر الإبلاغ */}
      <div className="text-center mt-4 d-flex justify-content-center gap-3 flex-wrap">
        <button
          className="btn btn-outline-secondary fw-bold px-4"
          onClick={() => setStage("chooseCategory")}
        >
          🏁 إنهاء التدريب
        </button>
        <button
          onClick={() => setShowReportModal(true)}
          className="btn btn-outline-danger btn-sm px-3 fw-bold"
        >
          🚩 الإبلاغ عن خطأ
        </button>
      </div>

      {/* Drawers */}
      <Drawer
        open={showWrongPopup}
        title="❌ الأسئلة الخاطئة"
        color="#ff4d4d"
        ids={wrongQuestionsMemo}
        currentQuestions={currentQuestions}
        onClose={() => {
          setShowWrongPopup(false);
          setInSection(false); // ✅ قفل الخاطئة → رجّع inSection
        }}
        onJump={(index) => {
          setPreviousIndex(currentIndex);
          handleOpenQuestion(index);
          setAnsweredQuestionId(currentQuestions[index].id);
          setShowWrongPopup(false);
          setInSection(true);
        }}
      />

      <Drawer
        open={showCorrectPopup}
        title="✅ الأسئلة الصحيحة"
        color="#28a745"
        ids={correctQuestionsMemo}
        currentQuestions={currentQuestions}
        onClose={() => {
          setShowCorrectPopup(false);
          setInSection(false);
        }}
        onJump={(index) => {
          setPreviousIndex(currentIndex);
          handleOpenQuestion(index);
          setAnsweredQuestionId(currentQuestions[index].id);
          setShowCorrectPopup(false);
          setInSection(true);
        }}
      />

      {/* Modal */}
      <ReportModal
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={sendReport}
        questionNumber={currentIndex + 1}
        reportText={reportText}
        setReportText={setReportText}
      />
    </div>
  );
};

export default Questions;
