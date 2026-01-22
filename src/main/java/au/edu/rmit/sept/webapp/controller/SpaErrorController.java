package au.edu.rmit.sept.webapp.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

@Controller
public class SpaErrorController implements ErrorController {

    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request, HttpServletResponse response) {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        Object uriObj = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        int status = (statusObj instanceof Integer) ? (Integer) statusObj : response.getStatus();
        String uri = (uriObj instanceof String) ? (String) uriObj : "";
        String method = request.getMethod();

        // Only forward GET 404s for client-side routes (non-API, no file extension)
        if ("GET".equalsIgnoreCase(method)
                && status == 404
                && uri != null
                && !uri.startsWith("/api")
                && !uri.contains(".")) {
            return "forward:/index.html";
        }

        // Otherwise, return JSON error (prevents circular forward)
        HttpStatus httpStatus = HttpStatus.resolve(status);
        if (httpStatus == null) httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        return new ResponseEntity<>(Map.of(
                "error", httpStatus.getReasonPhrase(),
                "status", status,
                "path", uri
        ), httpStatus);
    }
}
