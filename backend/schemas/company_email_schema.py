from marshmallow import Schema, fields, EXCLUDE


class CompanyEmailCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_id = fields.Integer(required=True)
    email = fields.Email(required=True)
    email_type = fields.Str(allow_none=True, load_default=None)
    source_url = fields.Str(allow_none=True, load_default=None)
    scraped_at = fields.DateTime(allow_none=True, load_default=None)


class CompanyEmailUpdateSchema(CompanyEmailCreateSchema):
    company_id = fields.Integer(required=False)
    email = fields.Email(required=False)
