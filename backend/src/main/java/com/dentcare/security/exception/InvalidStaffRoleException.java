package com.dentcare.security.exception;

/**
 * Exception thrown when an invalid role (such as PATIENT or unknown role) is requested for staff account provisioning.
 */
public class InvalidStaffRoleException extends RuntimeException {
    public InvalidStaffRoleException(String message) {
        super(message);
    }
}
