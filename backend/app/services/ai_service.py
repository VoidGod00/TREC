from sqlalchemy.orm import Session
import google.generativeai as genai
from datetime import datetime, timezone
from decimal import Decimal

from app.models.transaction import Transaction, TransactionType
from app.models.budget import AILog
from app.core.config import settings
from app.core.logging import logger
from app.schemas.analytics import AIResponse

# ─── Configure Gemini client ──────────────────────────────────────────────────
genai.configure(api_key=settings.GEMINI_API_KEY)

GEMINI_MODEL        = "gemini-2.5-flash"   # fast + cheap for most calls
GEMINI_MODEL_PRO    = "gemini-2.5-pro"     # richer answers for /ask
GEMINI_MODEL_FLASH  = "gemini-2.5-flash"   # categorization (single word)

SYSTEM_PROMPT = """You are TREC AI, a smart personal finance assistant.
You help users understand their spending habits, find savings opportunities,
and make better financial decisions.

You have access to the user's transaction history. Always:
- Be concise and actionable
- Use ₹ (Indian Rupee) as the currency symbol
- Provide specific numbers from the data
- Give 2-3 practical recommendations when relevant
- Be encouraging and non-judgmental

Never make up data that isn't provided. If data is insufficient, say so clearly."""


def _get_model(model_name: str) -> genai.GenerativeModel:
    return genai.GenerativeModel(
        model_name=model_name,
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.4,
            max_output_tokens=1024,
        ),
    )


class AIService:

    def ask(self, db: Session, user_id: int, question: str) -> AIResponse:
        """Answer a natural-language finance question using transaction context."""
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.date.desc()).limit(200).all()

        context = self._build_context(transactions)
        full_prompt = f"Transaction Data:\n{context}\n\nUser Question: {question}"

        logger.info("ai_query", user_id=user_id, question_preview=question[:50])

        model = _get_model(GEMINI_MODEL_PRO)
        response = model.generate_content(full_prompt)
        answer = response.text

        # Count tokens (Gemini returns usage metadata)
        tokens_used = None
        if hasattr(response, "usage_metadata"):
            tokens_used = (
                (response.usage_metadata.prompt_token_count or 0) +
                (response.usage_metadata.candidates_token_count or 0)
            )

        # Persist to AI log
        db.add(AILog(
            user_id=user_id,
            question=question,
            response=answer,
            model_used=GEMINI_MODEL_PRO,
            tokens_used=tokens_used,
        ))
        db.commit()

        return AIResponse(
            answer=answer,
            model_used=GEMINI_MODEL_PRO,
            timestamp=datetime.now(timezone.utc),
        )

    def auto_categorize(self, description: str) -> str:
        """Auto-categorize a transaction description into a fixed category."""
        categories = [
            "food", "transport", "rent", "utilities", "entertainment",
            "healthcare", "shopping", "travel", "education", "savings",
            "salary", "freelance", "investment", "other"
        ]

        prompt = (
            f"Categorize this transaction into exactly one of these categories: "
            f"{', '.join(categories)}\n\n"
            f'Transaction: "{description}"\n\n'
            f"Respond with ONLY the category name, nothing else."
        )

        # Use flash model — fast and cheap for single-word responses
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL_FLASH,
            generation_config=genai.GenerationConfig(max_output_tokens=10, temperature=0),
        )
        response = model.generate_content(prompt)
        category = response.text.strip().lower()
        return category if category in categories else "other"

    def generate_insights(self, db: Session, user_id: int) -> str:
        """Generate 3 proactive spending insights from recent transactions."""
        transactions = db.query(Transaction).filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.date.desc()).limit(100).all()

        context = self._build_context(transactions)
        prompt = (
            f"Analyze these transactions and provide 3 key financial insights:\n{context}\n\n"
            f"Focus on: spending patterns, budget risks, saving opportunities.\n"
            f"Format as a numbered list."
        )

        model = _get_model(GEMINI_MODEL)
        response = model.generate_content(prompt)
        return response.text

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def _build_context(self, transactions: list) -> str:
        if not transactions:
            return "No transactions found."

        lines = ["Date | Type | Category | Amount | Merchant | Note"]
        for t in transactions:
            lines.append(
                f"{t.date.strftime('%Y-%m-%d')} | "
                f"{t.type.value} | "
                f"{t.category.value} | "
                f"₹{t.amount} | "
                f"{t.merchant or '-'} | "
                f"{t.note or '-'}"
            )

        total_expense = sum(t.amount for t in transactions if t.type == TransactionType.EXPENSE)
        total_income  = sum(t.amount for t in transactions if t.type == TransactionType.INCOME)
        lines.append(f"\nSummary: Total Income ₹{total_income}, Total Expense ₹{total_expense}")
        return "\n".join(lines)
