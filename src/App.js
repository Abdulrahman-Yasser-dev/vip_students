import { useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import StudentInfo from "./pages/StudentInfo";
import { Route, Routes } from "react-router-dom";
import Questions from "./pages/Questions";
import Result from "./pages/Result";
import AdminPanel from "./pages/AdminPanel";
import QuestionPrintableView from "./pages/QuestionImageGenerator";
import AnswerReviewPage from "./pages/AnswerReviewPage";

function App() {
  const [student, setStudent] = useState(null);

  return (
    <>
      <Routes>
        <Route path="/" element={<StudentInfo setStudent={setStudent} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Questions" element={<Questions student={student} />} />
        <Route path="/Result" element={<Result />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/PDF" element={<QuestionPrintableView />} />
        <Route
          path="/review/:category/:type"
          element={<AnswerReviewPage student={student} />}
        />
      </Routes>
    </>
  );
}

export default App;
