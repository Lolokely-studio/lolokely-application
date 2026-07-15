from marshmallow import Schema, fields, EXCLUDE


class CompanyFinancialCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_id = fields.Integer(required=True)
    ticker = fields.Str(allow_none=True, load_default=None)
    exchange = fields.Str(allow_none=True, load_default=None)
    matched_name = fields.Str(allow_none=True, load_default=None)
    currency = fields.Str(allow_none=True, load_default=None)
    market_cap = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    total_revenue = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    net_income = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    gross_profit = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    employees = fields.Integer(allow_none=True, load_default=None)
    sector = fields.Str(allow_none=True, load_default=None)
    industry = fields.Str(allow_none=True, load_default=None)
    match_confidence = fields.Str(allow_none=True, load_default=None)
    as_of = fields.Date(allow_none=True, load_default=None)
    source = fields.Str(allow_none=True, load_default=None)


class CompanyFinancialUpdateSchema(CompanyFinancialCreateSchema):
    company_id = fields.Integer(required=False)
