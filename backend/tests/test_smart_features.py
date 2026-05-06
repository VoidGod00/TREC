import pytest
from unittest.mock import MagicMock, patch
from app.services.health_score_service import HealthScoreService
from app.services.predictive_budgeting_service import PredictiveBudgetingService
from app.services.receipt_scanner_service import ReceiptScannerService

# ─── HEALTH SCORE SERVICE TESTS ──────────────────────────────────────────────
class TestHealthScoreService:
    @pytest.fixture
    def service(self):
        return HealthScoreService()

    def test_calculate_score_perfect_balance(self, service):
        # Mocking a user with healthy financial habits
        mock_data = {
            "income": 5000,
            "expenses": 2000,
            "savings_rate": 60,
            "budget_compliance": 100,
            "essential_ratio": 30
        }
        score_data = service.compute_financial_health(mock_data)
        assert score_data["score"] >= 80
        assert "Excellent" in score_data["rating"]

    def test_calculate_score_poor_habits(self, service):
        # Mocking a user spending more than they earn
        mock_data = {
            "income": 2000,
            "expenses": 2500,
            "savings_rate": -25,
            "budget_compliance": 50,
            "essential_ratio": 90
        }
        score_data = service.compute_financial_health(mock_data)
        assert score_data["score"] < 40
        assert "Critical" in score_data["rating"]

# ─── PREDICTIVE BUDGETING TESTS ──────────────────────────────────────────────
class TestPredictiveBudgetingService:
    @patch('app.services.predictive_budgeting_service.genai.GenerativeModel')
    def test_generate_forecast_narrative(self, mock_model):
        # Mock Gemini response
        mock_chat = MagicMock()
        mock_chat.generate_content.return_value.text = "Your spending is projected to decrease."
        mock_model.return_value = mock_chat

        service = PredictiveBudgetingService()
        narrative = service.get_ai_forecast_analysis(history_data=[])

        assert "projected to decrease" in narrative
        mock_chat.generate_content.assert_called_once()

# ─── RECEIPT SCANNER TESTS ───────────────────────────────────────────────────
class TestReceiptScannerService:
    @patch('app.services.receipt_scanner_service.genai.GenerativeModel')
    def test_parse_receipt_success(self, mock_model):
        # Mock structured JSON response from Gemini
        mock_response = MagicMock()
        mock_response.text = '{"merchant_name": "Starbucks", "total": 15.50, "suggested_category": "Food"}'
        mock_model.return_value.generate_content.return_value = mock_response

        service = ReceiptScannerService()
        result = service.scan_receipt(base64_image="mock_data")

        assert result["merchant_name"] == "Starbucks"
        assert result["total"] == 15.50
        assert result["suggested_category"] == "Food"

    def test_invalid_json_handling(self):
        with patch('app.services.receipt_scanner_service.genai.GenerativeModel') as mock_model:
            mock_response = MagicMock()
            mock_response.text = "Not a JSON string"
            mock_model.return_value.generate_content.return_value = mock_response

            service = ReceiptScannerService()
            # Should handle the error gracefully or return a default structure
            result = service.scan_receipt(base64_image="mock_data")
            assert result["merchant_name"] == "Unknown Merchant"