package com.example.data.repository

import com.example.data.model.AuditLog
import com.example.data.model.Dispute
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import java.util.UUID

class AdminRepository {
    private val _disputes = MutableStateFlow<List<Dispute>>(emptyList())
    private val _auditLogs = MutableStateFlow<List<AuditLog>>(emptyList())

    fun observeDisputesForAdmin(): Flow<List<Dispute>> = _disputes

    fun observeAuditLogs(): Flow<List<AuditLog>> = _auditLogs

    suspend fun fileReportOrDispute(
        reporterId: String,
        targetType: String,
        targetId: String,
        reason: String
    ): Result<String> = runCatching {
        val id = "disp_${UUID.randomUUID().toString().take(10)}"
        val now = System.currentTimeMillis()
        _disputes.value = listOf(
            Dispute(
                id = id,
                reporterId = reporterId,
                targetType = targetType,
                targetId = targetId,
                reason = reason.trim().take(500),
                status = "open",
                createdAtEpochMs = now,
                updatedAtEpochMs = now
            )
        ) + _disputes.value
        id
    }

    suspend fun verifySeller(
        adminId: String,
        adminEmail: String,
        sellerId: String,
        verified: Boolean
    ): Result<Unit> = Result.failure(
        SecurityException("Administrative seller verification requires Cash N Carry Web Admin Console MFA and is disabled on mobile.")
    )

    suspend fun moderateProduct(
        adminId: String,
        adminEmail: String,
        productId: String,
        newStatus: String
    ): Result<Unit> = Result.failure(
        SecurityException("Administrative product moderation requires Cash N Carry Web Admin Console MFA and is disabled on mobile.")
    )

    suspend fun createOrUpdateVirtualGift(
        adminId: String,
        adminEmail: String,
        giftId: String?,
        name: String,
        category: String,
        coinCost: Long,
        animationType: String
    ): Result<Unit> = Result.failure(
        SecurityException("Virtual gift catalog management requires Cash N Carry Web Admin Console MFA and is disabled on mobile.")
    )

    suspend fun resolveDispute(
        adminId: String,
        adminEmail: String,
        disputeId: String,
        status: String,
        note: String
    ): Result<Unit> = Result.failure(
        SecurityException("Dispute resolution requires Cash N Carry Web Admin Console MFA and is disabled on mobile.")
    )
}
