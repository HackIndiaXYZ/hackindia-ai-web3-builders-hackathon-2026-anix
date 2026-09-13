# Frontend integration

The frontend source was not included in the uploaded backend archive, so no frontend source files are modified by this package. This avoids guessing or overwriting the existing UI.

Point the existing frontend at the Express backend, not the AI service:

`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

For a SAR upload, send `multipart/form-data` to:

`POST http://localhost:4000/predict`

Field name: `file`

Optional fields already supported by the backend:
- `anonymousUserId`
- `hardwareDetails` (JSON string)

The response contains:
- `colorized_sar`
- `reconstructed_sar` (this is the reconstructed optical image; field retained for API compatibility)
- `ensemble_mean`
- `uncertainty`
- `confidence`
- `inference_time`
- `model_version`

Example:

```js
const form = new FormData();
form.append("file", selectedFile);

const res = await fetch(`${API_BASE}/predict`, {
  method: "POST",
  body: form,
});

const result = await res.json();
```

Do not point the browser directly at `:8000`; Express is the application API and proxies the AI request internally to the FastAPI service.
