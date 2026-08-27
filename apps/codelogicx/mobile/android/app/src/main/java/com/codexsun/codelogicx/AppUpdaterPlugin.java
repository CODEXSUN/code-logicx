package com.codexsun.codelogicx;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    @com.getcapacitor.PluginMethod
    public void install(PluginCall call) {
        String source = call.getString("url");
        String expectedHash = call.getString("sha256");
        if (source == null || expectedHash == null || !source.startsWith("https://")) {
            call.reject("A secure update URL and SHA-256 checksum are required.");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(settings);
            call.reject("Allow CodeLogicX to install updates, then return to the app.", "INSTALL_PERMISSION_REQUIRED");
            return;
        }
        new Thread(() -> downloadAndInstall(call, source, expectedHash), "codelogicx-app-update").start();
    }

    private void downloadAndInstall(PluginCall call, String source, String expectedHash) {
        File directory = new File(getContext().getCacheDir(), "updates");
        File apk = new File(directory, "codelogicx-update.apk");
        try {
            if (!directory.exists() && !directory.mkdirs()) throw new IllegalStateException("Could not create update storage.");
            HttpURLConnection connection = (HttpURLConnection) new URL(source).openConnection();
            connection.setConnectTimeout(20_000);
            connection.setReadTimeout(60_000);
            connection.setInstanceFollowRedirects(true);
            if (connection.getResponseCode() != HttpURLConnection.HTTP_OK) throw new IllegalStateException("Update download failed.");
            try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(apk)) {
                byte[] buffer = new byte[16_384];
                int count;
                while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            } finally {
                connection.disconnect();
            }
            if (!sha256(apk).equalsIgnoreCase(expectedHash)) {
                apk.delete();
                throw new SecurityException("Downloaded update checksum did not match.");
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent install = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(install);
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[16_384];
            int count;
            while ((count = input.read(buffer)) != -1) digest.update(buffer, 0, count);
        }
        StringBuilder value = new StringBuilder();
        for (byte item : digest.digest()) value.append(String.format("%02x", item));
        return value.toString();
    }
}
