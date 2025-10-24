import { useNavigate } from "react-router-dom";

const ChooseCategory = (
  isLoading,
  categoriesSummary,
  filter,
  setFilter,
  numQuestionsByCategory,
  setNumQuestionsByCategory,
  clearSession,
  student,
  loadQuestionsByCategory,
  resetTest
) => {
  const navigate = useNavigate();

  const verbalCategories = [
    "اللفظي",
    "استيعاب المقروء",
    "التناظر اللفظي",
    "الخطأ السياقي",
    "الارتباط والاختلاف",
    "إكمال الجمل",
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
        <h2 className="text-center mb-5 fw-bold text-primary display-5">
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
                      <span className="badge bg-info text-dark fw-semibold px-3 py-2">
                        📝 المتبقي: {remaining}
                      </span>
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
                        className="btn btn-primary px-4 py-2 shadow-sm"
                        onClick={() => {
                          const numQuestions =
                            numQuestionsByCategory[category] || totalQuestions;

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
                            numQuestionsByCategory[category] || totalQuestions;
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
};

export default ChooseCategory;