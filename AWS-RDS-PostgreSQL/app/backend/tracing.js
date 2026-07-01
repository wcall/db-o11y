import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('wcall-rds-backend');

// Wraps a database action in a named span so every insert/query shows up as an
// explicit business-level span (above the low-level pg span). Records the table,
// operation, resulting row count, and any error.
export async function traceDbAction(name, attributes, fn) {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn();
      if (result && typeof result.rowCount === 'number') {
        span.setAttribute('db.rows_affected', result.rowCount);
      }
      return result;
    } catch (err) {
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
