import axios from "axios";
import React, { useEffect, useRef, useState } from "react";

const Result = ({
  questions,
  userAnswers,
  onRestart,
  student,
  selectedCategory,
  currentQuestions,
}) => {
  const done = useRef(false);
  const [showReview, setShowReview] = useState(false);

  // عدد الإجابات الصحيحة
  const correctCount = questions.reduce((count, question) => {
    const selectedIndex = userAnswers[question.id];
    const isCorrect = question.answers[selectedIndex]?.is_correct == 1;
    return isCorrect ? count + 1 : count;
  }, 0);

  useEffect(() => {
    if (window.MathJax) {
      window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }
  }, [showReview]);

  const total = questions.length;
  const wrongCount = total - correctCount;
  const percentage = ((correctCount / total) * 100).toFixed(1);

  // 📩 إرسال البيانات لمرة واحدة فقط
  const handleQuizFinish = async () => {
    if (done.current) return;
    try {
      await axios.post(`https://api.alamthal.org/api/students`, {
        name: student.name,
        phone: student.phone,
        email: student.email,
        score: correctCount,
        percentage: percentage,
      });
      done.current = true;
    } catch (error) {
      console.error(error);
    }
  };

  const sendResultMail = async () => {
    try {
      await axios.post("https://api.alamthal.org/api/email/sendMail", {
        email: student.email,
        name: student.name,
        phone: student.phone,
        correct: correctCount,
        wrong: wrongCount,
        percentage: percentage,
      });
    } catch (err) {
      console.error("❌ فشل في ارسال الدرجات:", err);
    }
  };

  useEffect(() => {
    handleQuizFinish();
    sendResultMail();
  }, []);

  return (
    <>
      {showReview ? (
        // ✅ صفحة مراجعة الإجابات (dark theme بدل الأبيض)
        <div className="w-100 text-white text-end">
          <h1 className="fs-3 fw-bold text-warning mb-4 text-center">
            📋 مراجعة إجاباتك
          </h1>

          <div
            className="w-100"
            style={{ maxWidth: "800px", margin: "0 auto" }}
          >
            {questions.map((question) => {
              const selected = userAnswers[question.id];
              const isCorrect = question.answers[selected]?.is_correct == 1;

              return (
                <div
                  key={question.id}
                  className={`p-3 rounded mb-4 ${
                    isCorrect
                      ? "border border-success bg-dark"
                      : "border border-danger bg-dark"
                  }`}
                >
                  {/* السؤال */}
                  <p
                    className="fw-bold mb-3 fs-5 text-light"
                    dangerouslySetInnerHTML={{
                      __html: question.content
                        ?.replaceAll("@@PLUGINFILE@@", "/images")
                        ?.replaceAll(
                          'src="/quiz/images',
                          'src="https://quiz.alamthal.org/quiz/images'
                        )
                        ?.replaceAll(
                          'src="/images',
                          'src="https://quiz.alamthal.org/quiz/images'
                        )
                        ?.replaceAll(
                          "<img",
                          '<img style="max-width:100%;height:auto;display:block;margin:auto;"'
                        ),
                    }}
                  />

                  {/* الاختيارات */}
                  <div className="d-flex flex-column gap-2">
                    {question.answers.map((a, i) => {
                      const isCorrect = a.is_correct == 1;
                      const isWrongChoice = selected === i && !isCorrect;

                      let className =
                        "p-2 rounded d-flex align-items-center gap-2 border ";
                      if (isCorrect)
                        className += "bg-success text-white border-success";
                      else if (isWrongChoice)
                        className +=
                          "bg-danger text-white border-danger fw-bold";
                      else className += "bg-secondary text-white border-0";

                      return (
                        <div key={i} className={className}>
                          {isCorrect && <span>✅</span>}
                          {isWrongChoice && <span>❌</span>}
                          <span dangerouslySetInnerHTML={{ __html: a.text }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* زر الإعادة */}
          <div className="mt-4 text-center">
            <button
              onClick={() =>
                onRestart(selectedCategory, currentQuestions.length)
              }
              className="btn btn-warning text-dark fw-bold mt-3 px-4 py-2"
            >
              🔁 إعادة الاختبار
            </button>
          </div>
        </div>
      ) : (
        // ✅ شاشة النتيجة النهائية (تبقى زي intro/test)
        <div className="text-center">
          <h1 className="fs-2 fw-bold text-warning mb-3">
            📊 النتيجة النهائية
          </h1>

          <div className="mb-4">
            <p className="fs-5 mb-1">
              📌 عدد الأسئلة: <span className="fw-bold">{total}</span>
            </p>
            <p className="fs-5 mb-1 text-success">
              ✅ الصحيحة: <span className="fw-bold">{correctCount}</span>
            </p>
            <p className="fs-5 mb-1 text-danger">
              ❌ الخاطئة: <span className="fw-bold">{wrongCount}</span>
            </p>
            <p className="fs-5 mb-0">
              🎯 النسبة:{" "}
              <span className="fw-bold text-info">{percentage}%</span>
            </p>
          </div>

          {/* الأزرار */}
          <div className="d-flex flex-column gap-3">
            <button
              onClick={() => setShowReview(true)}
              className="btn btn-primary btn-lg fw-bold"
            >
              🔍 مراجعة إجاباتك
            </button>

            <button
              onClick={() =>
                onRestart(selectedCategory, currentQuestions.length)
              }
              className="btn btn-warning btn-lg fw-bold text-dark"
            >
              🔁 إعادة الاختبار
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Result;
