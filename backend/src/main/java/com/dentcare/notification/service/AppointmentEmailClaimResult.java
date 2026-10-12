package com.dentcare.notification.service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Minimal claim result representing leased outbox notification claims.
 * Contains only non-sensitive tokens, IDs, and lease expiry.
 */
public record AppointmentEmailClaimResult(
        String claimToken,
        List<Long> claimedNotificationIds,
        LocalDateTime leaseUntil,
        int claimedCount
) {
    public AppointmentEmailClaimResult {
        claimedNotificationIds = claimedNotificationIds == null
                ? List.of()
                : Collections.unmodifiableList(claimedNotificationIds);
    }

    public static AppointmentEmailClaimResult empty(String claimToken, LocalDateTime leaseUntil) {
        return new AppointmentEmailClaimResult(claimToken, List.of(), leaseUntil, 0);
    }

    public boolean hasClaims() {
        return claimedCount > 0;
    }
}
