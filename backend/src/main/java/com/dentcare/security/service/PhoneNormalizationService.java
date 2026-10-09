package com.dentcare.security.service;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Service providing narrow, well-defined E.164 phone normalization for
 * Sri Lankan mobile numbers (+94).
 *
 * Supported valid input variations resolving to identical canonical E.164 (+947XXXXXXXX):
 * - 0771234567   (National 10-digit mobile)
 * - 771234567    (National 9-digit mobile without trunk prefix)
 * - +94771234567 (International E.164 format)
 * - 0094771234567 (International IDD prefix format)
 *
 * Strict Rejection Rules:
 * - Null, blank, or excessively long input (> 30 characters).
 * - Fixed landlines (area codes 01x, 02x, 03x, 04x, 05x, 06x, 08x, 09x).
 * - Too-short or too-long digit sequences.
 * - Non-ASCII digits and unpermitted punctuation/symbols.
 * - Extensions (e.g. 'ext') or multiple phone numbers (delimiters like ',', ';', '/').
 * - Country codes other than Sri Lanka (+94).
 */
@Service
public class PhoneNormalizationService {

    public static final String SRI_LANKA_COUNTRY_CODE = "+94";
    public static final int MAX_INPUT_LENGTH = 30;
    public static final int CANONICAL_E164_LENGTH = 12; // "+94" (3) + "7" (1) + 8 digits = 12 chars
    public static final int NATIONAL_MOBILE_SUBSCRIBER_LENGTH = 9; // "7" + 8 digits = 9 digits

    private static final Pattern PERMITTED_RAW_CHARS = Pattern.compile("^[0-9+()\\-\\s]+$");
    private static final Pattern CANONICAL_SRI_LANKA_MOBILE_PATTERN = Pattern.compile("^\\+947[0-2,4-8]\\d{7}$");

    /**
     * Normalizes a Sri Lankan mobile number into its canonical E.164 representation (+947XXXXXXXX).
     *
     * @param rawInput input string containing phone number
     * @return canonical E.164 formatted string (+947XXXXXXXX)
     * @throws IllegalArgumentException if the input is null, malformed, non-mobile, or not Sri Lankan
     */
    public String normalizeMobile(String rawInput) {
        if (rawInput == null) {
            throw new IllegalArgumentException("Phone number input cannot be null");
        }
        String trimmed = rawInput.trim();
        if (trimmed.isEmpty()) {
            throw new IllegalArgumentException("Phone number input cannot be empty");
        }
        if (trimmed.length() > MAX_INPUT_LENGTH) {
            throw new IllegalArgumentException("Phone number input exceeds maximum allowed length of " + MAX_INPUT_LENGTH + " characters");
        }

        // Validate allowed character set: only ASCII digits and permitted visual separators (+, -, (, ), space)
        if (!PERMITTED_RAW_CHARS.matcher(trimmed).matches()) {
            throw new IllegalArgumentException("Phone number contains illegal characters, letters, extensions, or unexpected punctuation");
        }

        // Check for multiple '+' signs or '+' not at index 0
        int plusIndex = trimmed.indexOf('+');
        if (plusIndex > 0 || (plusIndex == 0 && trimmed.indexOf('+', 1) != -1)) {
            throw new IllegalArgumentException("Invalid placement of international '+' prefix");
        }

        // Strip allowed visual separators: spaces, hyphens, parentheses
        String clean = trimmed.replaceAll("[\\s\\-()]", "");

        String nationalDigits;

        if (clean.startsWith("+")) {
            if (!clean.startsWith("+94")) {
                throw new IllegalArgumentException("Unsupported country code; only Sri Lankan (+94) numbers are supported");
            }
            nationalDigits = clean.substring(3);
        } else if (clean.startsWith("0094")) {
            nationalDigits = clean.substring(4);
        } else if (clean.startsWith("00")) {
            throw new IllegalArgumentException("Unsupported international prefix or country code");
        } else if (clean.startsWith("0")) {
            nationalDigits = clean.substring(1);
        } else {
            nationalDigits = clean;
        }

        // Validate national subscriber number
        if (nationalDigits.isEmpty()) {
            throw new IllegalArgumentException("Phone number does not contain subscriber digits");
        }

        // Verify national digits consist solely of ASCII digits
        for (int i = 0; i < nationalDigits.length(); i++) {
            char c = nationalDigits.charAt(i);
            if (c < '0' || c > '9') {
                throw new IllegalArgumentException("Phone number contains non-ASCII digits");
            }
        }

        // Check for Sri Lankan fixed landline prefixes (01x Colombo, 08x Kandy, 02x Jaffna, etc.)
        if (nationalDigits.startsWith("1") || nationalDigits.startsWith("2") ||
                nationalDigits.startsWith("3") || nationalDigits.startsWith("4") ||
                nationalDigits.startsWith("5") || nationalDigits.startsWith("6") ||
                nationalDigits.startsWith("8") || nationalDigits.startsWith("9")) {
            throw new IllegalArgumentException("Fixed landline numbers are not supported; phone must be a mobile number");
        }

        if (!nationalDigits.startsWith("7")) {
            throw new IllegalArgumentException("Invalid mobile prefix; Sri Lankan mobile numbers must begin with operator code 7");
        }

        if (nationalDigits.length() < NATIONAL_MOBILE_SUBSCRIBER_LENGTH) {
            throw new IllegalArgumentException("Phone number is too short for a valid mobile subscriber number");
        }
        if (nationalDigits.length() > NATIONAL_MOBILE_SUBSCRIBER_LENGTH) {
            throw new IllegalArgumentException("Phone number is too long for a valid mobile subscriber number");
        }

        String canonicalE164 = SRI_LANKA_COUNTRY_CODE + nationalDigits;

        // Verify known Sri Lankan mobile operator ranges (70, 71, 72, 74, 75, 76, 77, 78)
        if (!CANONICAL_SRI_LANKA_MOBILE_PATTERN.matcher(canonicalE164).matches()) {
            throw new IllegalArgumentException("Invalid Sri Lankan mobile operator prefix");
        }

        return canonicalE164;
    }

    /**
     * Checks whether a raw phone number input represents a valid Sri Lankan mobile number.
     *
     * @param rawInput input string
     * @return true if valid and normalizable, false otherwise
     */
    public boolean isValidMobile(String rawInput) {
        try {
            normalizeMobile(rawInput);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
