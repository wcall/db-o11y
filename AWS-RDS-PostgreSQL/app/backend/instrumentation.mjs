// OpenTelemetry bootstrap — preloaded via `node --import ./instrumentation.mjs`
// so the `pg` module is patched BEFORE server.js/db.js import it (ESM imports
// are hoisted, so this must run as a preload, not a top-of-file import).
//
// Enables SQLCommenter on the pg client: every statement gets a trailing
// /*traceparent='00-<traceid>-<spanid>-01'*/ comment built from the active span,
// which Grafana DB Observability query_samples reads to link samples to traces.
import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

// Resource attributes Grafana Cloud Application Observability keys on:
// service.name identifies the service; service.namespace groups services into an
// application; deployment.environment separates prod/staging/dev views;
// service.instance.id distinguishes instances. All overridable via env.
const resource = resourceFromAttributes({
  'service.name': process.env.OTEL_SERVICE_NAME || 'wcall-rds-backend',
  'service.namespace': process.env.OTEL_SERVICE_NAMESPACE || 'db-o11y',
  'deployment.environment': process.env.DEPLOYMENT_ENVIRONMENT || 'demo',
  'service.instance.id': process.env.HOSTNAME || 'local',
});

// Endpoint is read from OTEL_EXPORTER_OTLP_ENDPOINT (points at Alloy's OTLP
// receiver, e.g. http://host.docker.internal:4318). If unset, spans simply
// aren't exported — the traceparent comment still appears in query samples.
const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    // The load-bearing option: append the W3C traceparent as a SQL comment.
    new PgInstrumentation({ addSqlCommenterCommentToQueries: true }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
