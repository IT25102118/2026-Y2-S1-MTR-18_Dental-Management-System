package com.dentcare.clinical.validation;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Reusable application-level validator for the FDI Two-Digit Tooth Numbering System (ISO 3950).
 * Validates adult permanent teeth (quadrants 1-4, teeth 1-8)
 * and pediatric primary/deciduous teeth (quadrants 5-8, teeth 1-5).
 */
public final class FdiToothNumberValidator {

    private static final Set<Integer> VALID_FDI_NUMBERS;

    static {
        Set<Integer> numbers = new HashSet<>();
        // Permanent adult dentition: Quadrants 1-4, teeth 1-8 (32 teeth)
        for (int quadrant = 1; quadrant <= 4; quadrant++) {
            for (int tooth = 1; tooth <= 8; tooth++) {
                numbers.add(quadrant * 10 + tooth);
            }
        }
        // Deciduous primary dentition: Quadrants 5-8, teeth 1-5 (20 teeth)
        for (int quadrant = 5; quadrant <= 8; quadrant++) {
            for (int tooth = 1; tooth <= 5; tooth++) {
                numbers.add(quadrant * 10 + tooth);
            }
        }
        VALID_FDI_NUMBERS = Collections.unmodifiableSet(numbers);
    }

    private FdiToothNumberValidator() {
        // Utility class - prevent instantiation
    }

    /**
     * Checks whether the tooth number is a valid FDI two-digit number.
     * Returns true for null to support nullable tooth number fields (e.g., general oral findings).
     *
     * @param toothNumber the tooth number to validate (nullable)
     * @return true if null or a valid FDI number, false otherwise
     */
    public static boolean isValid(Integer toothNumber) {
        if (toothNumber == null) {
            return true;
        }
        return VALID_FDI_NUMBERS.contains(toothNumber);
    }

    /**
     * Checks whether the tooth number is strictly a valid, non-null FDI number.
     *
     * @param toothNumber the tooth number to validate
     * @return true if non-null and a valid FDI number, false otherwise
     */
    public static boolean isValidStrict(Integer toothNumber) {
        return toothNumber != null && VALID_FDI_NUMBERS.contains(toothNumber);
    }

    /**
     * Checks whether the tooth number belongs to permanent (adult) dentition (11-18, 21-28, 31-38, 41-48).
     *
     * @param toothNumber the tooth number to check
     * @return true if non-null and belongs to permanent dentition, false otherwise
     */
    public static boolean isPermanent(Integer toothNumber) {
        if (toothNumber == null || !VALID_FDI_NUMBERS.contains(toothNumber)) {
            return false;
        }
        int quadrant = toothNumber / 10;
        return quadrant >= 1 && quadrant <= 4;
    }

    /**
     * Checks whether the tooth number belongs to primary (deciduous) dentition (51-55, 61-65, 71-75, 81-85).
     *
     * @param toothNumber the tooth number to check
     * @return true if non-null and belongs to primary dentition, false otherwise
     */
    public static boolean isPrimary(Integer toothNumber) {
        if (toothNumber == null || !VALID_FDI_NUMBERS.contains(toothNumber)) {
            return false;
        }
        int quadrant = toothNumber / 10;
        return quadrant >= 5 && quadrant <= 8;
    }

    /**
     * Returns an unmodifiable set of all 52 valid FDI numbers.
     *
     * @return unmodifiable set containing all 52 valid FDI tooth numbers
     */
    public static Set<Integer> getAllValidNumbers() {
        return VALID_FDI_NUMBERS;
    }
}
