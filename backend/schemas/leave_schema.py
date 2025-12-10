from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import date

class LeaveRequestSchema(Schema):
    start_date = fields.Date(required=True)
    end_date = fields.Date(required=True)
    leave_type = fields.Str(required=True, validate=validate.OneOf(['vacation', 'sick', 'personal', 'other']))
    reason = fields.Str(allow_none=True, missing=None)
    
    @validates_schema
    def validate_dates(self, data, **kwargs):
        if 'start_date' in data and 'end_date' in data:
            if data['start_date'] > data['end_date']:
                raise ValidationError('end_date must be after or equal to start_date')
            # Allow today's date but not past dates
            today = date.today()
            if data['start_date'] < today:
                raise ValidationError('start_date cannot be in the past')

class LeaveApprovalSchema(Schema):
    status = fields.Str(required=True, validate=validate.OneOf(['approved', 'rejected']))
    rejection_reason = fields.Str(allow_none=True, missing=None)
