use reqwest::{Method, Url};
use serde::{Deserialize, Serialize};

use crate::error::{DesktopError, DesktopResult};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudRequestInput {
    authorization: Option<String>,
    body: Option<String>,
    method: String,
    url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudResponse {
    body: String,
    status: u16,
}

#[tauri::command]
pub async fn request_codelogicx_cloud(input: CloudRequestInput) -> DesktopResult<CloudResponse> {
    let url = allowed_cloud_url(&input.url)?;
    let method = match input.method.as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        _ => return Err(DesktopError::Policy("Unsupported cloud request method.".into())),
    };
    let client = reqwest::Client::new();
    let mut request = client.request(method, url);
    if let Some(authorization) = input.authorization.filter(|value| !value.is_empty()) {
        request = request.header("Authorization", authorization);
    }
    if let Some(body) = input.body {
        request = request.header("Content-Type", "application/json").body(body);
    }
    let response = request.send().await?;
    let status = response.status().as_u16();
    let body = response.text().await?;
    Ok(CloudResponse { body, status })
}

fn allowed_cloud_url(value: &str) -> DesktopResult<Url> {
    let url = Url::parse(value)
        .map_err(|_| DesktopError::Policy("The cloud request URL is invalid.".into()))?;
    let local = matches!(url.host_str(), Some("127.0.0.1" | "localhost"));
    if url.scheme() != "https" && !(local && url.scheme() == "http") {
        return Err(DesktopError::Policy(
            "Cloud requests require HTTPS or a local development server.".into(),
        ));
    }
    Ok(url)
}
