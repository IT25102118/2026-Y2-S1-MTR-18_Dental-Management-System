package com.dentcare.clinical.exception;

/**
 * Exception thrown when a tooth finding cannot be found.
 */
public class ToothFindingNotFoundException extends RuntimeException {

    private final Long findingId;

    public ToothFindingNotFoundException(Long findingId) {
        super("Tooth finding not found with id: " + findingId);
        this.findingId = findingId;
    }

    public Long getFindingId() {
        return findingId;
    }
}
