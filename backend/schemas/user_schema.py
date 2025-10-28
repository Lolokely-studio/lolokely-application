from marshmallow import Schema, fields, validate, validates_schema, ValidationError
from datetime import datetime

class UserSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True, validate=validate.Length(min=6))
    first_name = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    last_name = fields.Str(required=True, validate=validate.Length(min=1, max=50))

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)

class TaskSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(allow_none=True)
    status = fields.Str(validate=validate.OneOf(['todo', 'in_progress', 'completed']))
    priority = fields.Str(validate=validate.OneOf(['low', 'medium', 'high']))
    due_date = fields.DateTime(allow_none=True)

class SubtaskSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    description = fields.Str(allow_none=True)
    status = fields.Str(validate=validate.OneOf(['todo', 'in_progress', 'completed']))
    priority = fields.Str(validate=validate.OneOf(['low', 'medium', 'high']))
    due_date = fields.DateTime(allow_none=True)
