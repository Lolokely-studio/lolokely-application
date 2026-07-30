from marshmallow import Schema, fields, EXCLUDE, validate

COMPANY_STATUSES = ['new', 'contacted', 'in_discussion', 'won', 'lost']


class CompanyCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    company_name = fields.Str(required=True)
    # DB: domain is NOT NULL
    domain = fields.Str(required=True)
    country = fields.Str(allow_none=True, load_default=None)
    city = fields.Str(allow_none=True, load_default=None)
    region = fields.Str(allow_none=True, load_default=None)
    website = fields.Str(allow_none=True, load_default=None)
    founded_year = fields.Integer(allow_none=True, load_default=None)
    company_type = fields.Str(allow_none=True, load_default=None)
    source = fields.Str(allow_none=True, load_default=None)
    source_id = fields.Str(allow_none=True, load_default=None)
    source_url = fields.Str(allow_none=True, load_default=None)
    notes = fields.Str(allow_none=True, load_default=None)
    status = fields.Str(
        allow_none=True,
        load_default='new',
        validate=validate.OneOf(COMPANY_STATUSES),
    )
    # DB: dedup_key is a generated column — never accept writes
    dedup_key = fields.Str(dump_only=True)


class CompanyUpdateSchema(CompanyCreateSchema):
    company_name = fields.Str(required=False)
    domain = fields.Str(required=False, allow_none=False)


class CompanyStatusPatchSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    status = fields.Str(required=True, validate=validate.OneOf(COMPANY_STATUSES))
