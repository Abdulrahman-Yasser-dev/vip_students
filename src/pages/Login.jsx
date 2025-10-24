// src/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await axios.post(`https://api.alamthal.org/api/admin-login`, {
        username,
        password,
      });

      localStorage.setItem('admin_logged_in', 'true');
      navigate('/admin');
    } catch (err) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', backgroundColor: '#121212', fontFamily: 'Tajawal' }}
    >
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5}>
            <Card
              className="shadow-lg border border-warning"
              style={{ backgroundColor: '#1E1E1E', color: '#FFF' }}
            >
              <Card.Body>
                <h3 className="text-center mb-4" style={{ color: '#FFD700' }}>
                  تسجيل دخول المدير
                </h3>

                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleLogin}>
                  <Form.Group controlId="username" className="mb-3">
                    <Form.Label style={{ color: '#FFD700' }}>اسم المستخدم</Form.Label>
                    <Form.Control
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{
                        backgroundColor: '#121212',
                        borderColor: '#FFD700',
                        color: '#FFF',
                      }}
                    />
                  </Form.Group>

                  <Form.Group controlId="password" className="mb-4">
                    <Form.Label style={{ color: '#FFD700' }}>كلمة المرور</Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        backgroundColor: '#121212',
                        borderColor: '#FFD700',
                        color: '#FFF',
                      }}
                    />
                  </Form.Group>

                  <Button
                    variant="warning"
                    type="submit"
                    className="w-100 fw-bold"
                    style={{ color: '#121212' }}
                  >
                    دخول
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
