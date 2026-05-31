const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    // ZodError has `.issues`, not `.errors`
    const issues = err.issues || err.errors || [];
    const errorMessages = issues.map((e) => ({
      field: e.path?.join('.') || 'unknown',
      message: e.message,
    }));
    res.status(400).json({
      error: errorMessages.length > 0 ? errorMessages[0].message : 'Validation Error',
      details: errorMessages,
    });
  }
};

export default validate;
