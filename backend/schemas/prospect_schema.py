from marshmallow import Schema, fields, EXCLUDE


class ProspectCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_id = fields.Integer(required=True)
    sent_by = fields.Str(allow_none=True, load_default=None)
    contract_value = fields.Decimal(allow_none=True, load_default=None, as_string=True)
    contract_url = fields.Str(allow_none=True, load_default=None)
    contract_signed_at = fields.Date(allow_none=True, load_default=None)
    notes = fields.Str(allow_none=True, load_default=None)
    status = fields.Str(allow_none=True, load_default=None)
    sent_at = fields.DateTime(allow_none=True, load_default=None)
    contract_status = fields.Str(allow_none=True, load_default=None)
    contract_currency = fields.Str(allow_none=True, load_default=None)


class ProspectUpdateSchema(ProspectCreateSchema):
    company_id = fields.Integer(required=False)
