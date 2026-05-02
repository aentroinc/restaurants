"""Safe formula evaluator for Custom KPIs.

Grammar (a strict subset of Python expressions):
    expr   := term (('+' | '-') term)*
    term   := factor (('*' | '/' | '%') factor)*
    factor := '-'? atom ('**' factor)?
    atom   := NUMBER | NAME | '(' expr ')' | call
    call   := NAME '(' (expr (',' expr)*)? ')'

Only numeric literals, identifier references, parenthesization, four
arithmetic operators, modulo, exponent, and a whitelist of helper
functions are permitted. Anything else (attribute access, string
literals, comparisons, boolean ops, list/dict literals, comprehensions,
calls to arbitrary names, etc.) is rejected.

Names are looked up in a `bindings` dict provided at evaluation time;
missing names default to 0 to keep aggregation results well-defined when
a column is null.
"""
from __future__ import annotations

import ast
from typing import Any, Callable

ALLOWED_BIN = (
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.FloorDiv,
)
ALLOWED_UNARY = (ast.UAdd, ast.USub)


class FormulaError(ValueError):
    pass


def _safe_div(a: float, b: float) -> float:
    if b == 0:
        return 0.0
    return a / b


WHITELISTED_FUNCS: dict[str, Callable[..., Any]] = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "if": lambda cond, then, else_: then if cond else else_,
    "safe_div": _safe_div,
}


class SafeEvaluator(ast.NodeVisitor):
    def __init__(self, bindings: dict[str, float]):
        self.bindings = bindings

    def visit_Expression(self, node):
        return self.visit(node.body)

    def visit_BinOp(self, node):
        if not isinstance(node.op, ALLOWED_BIN):
            raise FormulaError(f"Operator not allowed: {type(node.op).__name__}")
        left = float(self.visit(node.left))
        right = float(self.visit(node.right))
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return _safe_div(left, right)
        if isinstance(node.op, ast.FloorDiv):
            return _safe_div(left, right) // 1 if right != 0 else 0.0
        if isinstance(node.op, ast.Mod):
            return left % right if right != 0 else 0.0
        if isinstance(node.op, ast.Pow):
            return left ** right
        raise FormulaError("unreachable")

    def visit_UnaryOp(self, node):
        if not isinstance(node.op, ALLOWED_UNARY):
            raise FormulaError(f"Unary op not allowed: {type(node.op).__name__}")
        v = float(self.visit(node.operand))
        return -v if isinstance(node.op, ast.USub) else v

    def visit_Constant(self, node):
        if not isinstance(node.value, (int, float)):
            raise FormulaError("Only numeric literals are allowed")
        return float(node.value)

    def visit_Name(self, node):
        return float(self.bindings.get(node.id, 0))

    def visit_Call(self, node):
        if not isinstance(node.func, ast.Name):
            raise FormulaError("Only direct function calls allowed")
        fn = WHITELISTED_FUNCS.get(node.func.id)
        if fn is None:
            raise FormulaError(f"Function not allowed: {node.func.id}")
        if node.keywords:
            raise FormulaError("Keyword arguments not allowed")
        args = [self.visit(a) for a in node.args]
        return float(fn(*args))

    def generic_visit(self, node):
        raise FormulaError(f"Node not allowed: {type(node).__name__}")


def parse_formula(source: str) -> ast.AST:
    """Parse and validate without evaluating. Returns the AST."""
    src = _normalize(source)
    try:
        return ast.parse(src, mode="eval")
    except SyntaxError as e:
        raise FormulaError(f"Syntax error: {e}") from e


def evaluate_formula_safe(source: str, bindings: dict[str, float]) -> float:
    tree = parse_formula(source)
    return float(SafeEvaluator(bindings).visit(tree))


def _normalize(source: str) -> str:
    """Replace `{field_name}` placeholders with bare identifiers."""
    out = []
    i = 0
    while i < len(source):
        ch = source[i]
        if ch == "{":
            j = source.index("}", i)
            ident = source[i + 1 : j].strip()
            if not ident.isidentifier():
                raise FormulaError(f"Invalid identifier: {ident!r}")
            out.append(ident)
            i = j + 1
        else:
            out.append(ch)
            i += 1
    return "".join(out)
