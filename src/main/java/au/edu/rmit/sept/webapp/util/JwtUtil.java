package au.edu.rmit.sept.webapp.util;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import com.fasterxml.jackson.databind.ObjectMapper;

public class JwtUtil {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static String createToken(String subjectEmail, String role, String secret, long ttlSeconds) {
        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + ttlSeconds;

            Map<String, Object> header = new HashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            Map<String, Object> payload = new HashMap<>();
            payload.put("sub", subjectEmail);
            payload.put("role", role);
            payload.put("iat", now);
            payload.put("exp", exp);

            String h = base64Url(MAPPER.writeValueAsBytes(header));
            String p = base64Url(MAPPER.writeValueAsBytes(payload));
            String signature = hmacSha256(h + "." + p, secret);
            return h + "." + p + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create JWT", e);
        }
    }

    public static Map<String, Object> verify(String token, String secret) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) throw new IllegalArgumentException("Invalid token format");
            String sig = hmacSha256(parts[0] + "." + parts[1], secret);
            if (!constantTimeEquals(sig, parts[2])) throw new SecurityException("Bad signature");

            byte[] payloadJson = Base64.getUrlDecoder().decode(parts[1]);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = MAPPER.readValue(payloadJson, Map.class);
            // exp check
            Object expObj = payload.get("exp");
             if (expObj instanceof Number exp) {
            long now = Instant.now().getEpochSecond();
    if (now >= exp.longValue()) throw new SecurityException("Token expired");
}

            return payload;
        } catch (SecurityException se) {
            throw se;
        } catch (Exception e) {
            throw new SecurityException("Token verification failed", e);
        }
    }

    private static String base64Url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private static String hmacSha256(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return base64Url(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int res = 0;
        for (int i = 0; i < a.length(); i++) res |= a.charAt(i) ^ b.charAt(i);
        return res == 0;
    }
}
