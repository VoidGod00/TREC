import pytest
from unittest.mock import patch, MagicMock
from app.services.ai_service import AIService
from app.models.budget import AILog


def _mock_gemini_response(text: str, input_tokens: int = 100, output_tokens: int = 50):
    mock = MagicMock()
    mock.text = text
    mock.usage_metadata.prompt_token_count = input_tokens
    mock.usage_metadata.candidates_token_count = output_tokens
    return mock


class TestAIService:

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_ask_returns_answer(self, MockModel, db, test_user, multiple_transactions):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("You spent ₹2500 this month.")
        result = AIService().ask(db, test_user.id, "How much did I spend?")
        assert result.answer == "You spent ₹2500 this month."
        assert "gemini" in result.model_used

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_ask_logs_to_db(self, MockModel, db, test_user):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("You spent ₹500 on food.")
        AIService().ask(db, test_user.id, "Food spending?")
        log = db.query(AILog).filter(AILog.user_id == test_user.id).first()
        assert log.question == "Food spending?"
        assert log.tokens_used == 150

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_auto_categorize_food(self, MockModel):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("food")
        assert AIService().auto_categorize("Starbucks coffee") == "food"

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_auto_categorize_unknown_returns_other(self, MockModel):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("unknown_xyz")
        assert AIService().auto_categorize("random thing") == "other"

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_generate_insights(self, MockModel, db, test_user, multiple_transactions):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("1. Spend less\n2. Save more")
        result = AIService().generate_insights(db, test_user.id)
        assert isinstance(result, str) and len(result) > 0

    def test_build_context_empty(self):
        assert AIService()._build_context([]) == "No transactions found."

    def test_build_context_with_data(self, db, test_user, multiple_transactions):
        result = AIService()._build_context(multiple_transactions)
        assert "₹" in result and "Summary:" in result


class TestAIAPI:

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_ask_endpoint(self, MockModel, client, auth_headers):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("Finances look good!")
        r = client.post("/api/v1/ai/ask", headers=auth_headers, json={"question": "How am I doing?"})
        assert r.status_code == 200 and "answer" in r.json()

    def test_ask_empty_rejected(self, client, auth_headers):
        assert client.post("/api/v1/ai/ask", headers=auth_headers, json={"question": "  "}).status_code == 400

    def test_ask_too_long_rejected(self, client, auth_headers):
        assert client.post("/api/v1/ai/ask", headers=auth_headers, json={"question": "x"*1001}).status_code == 400

    def test_ask_requires_auth(self, client):
        assert client.post("/api/v1/ai/ask", json={"question": "Hi"}).status_code == 401

    @patch("app.services.ai_service.genai.GenerativeModel")
    def test_categorize_endpoint(self, MockModel, client, auth_headers):
        MockModel.return_value.generate_content.return_value = _mock_gemini_response("transport")
        r = client.post("/api/v1/ai/categorize", headers=auth_headers, json={"description": "Uber ride"})
        assert r.status_code == 200 and "category" in r.json()

    def test_history_endpoint(self, client, auth_headers, db, test_user):
        db.add(AILog(user_id=test_user.id, question="Q", response="A", model_used="gemini-2.5-pro", tokens_used=10))
        db.commit()
        r = client.get("/api/v1/ai/history", headers=auth_headers)
        assert r.status_code == 200 and r.json()[0]["question"] == "Q"
