package com.example.data.repository

import android.content.ContentResolver
import android.net.Uri
import com.example.data.model.Auction
import com.example.data.model.AuctionBid
import com.example.data.model.GiftTransaction
import com.example.data.model.Livestream
import com.example.data.model.Product
import com.example.data.model.ShortVideo
import com.example.data.model.StreamMessage
import com.example.data.model.TopGifterEntry
import com.example.data.model.UiState
import com.example.data.model.VideoComment
import com.example.data.model.VirtualGift
import com.example.data.model.WalletBalance
import com.example.data.model.WalletLedgerEntry
import com.example.data.remote.CloudflareResult
import com.example.data.remote.CloudflareSyncRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import java.io.File
import java.util.UUID

class LiveCommerceRepository(
    private val syncRepo: CloudflareSyncRepository? = null
) {
    private val _livestreams = MutableStateFlow<List<Livestream>>(emptyList())
    private val _livestreamsError = MutableStateFlow<String?>(null)
    private val _livestreamsLoaded = MutableStateFlow(false)

    private val _auctions = MutableStateFlow<List<Auction>>(emptyList())
    private val _auctionsError = MutableStateFlow<String?>(null)
    private val _auctionsLoaded = MutableStateFlow(false)

    private val _shortVideos = MutableStateFlow<List<ShortVideo>>(emptyList())
    private val _videosError = MutableStateFlow<String?>(null)
    private val _videosLoaded = MutableStateFlow(false)

    private val _streamMessages = MutableStateFlow<Map<String, List<StreamMessage>>>(emptyMap())
    private val _topGifters = MutableStateFlow<Map<String, List<TopGifterEntry>>>(emptyMap())
    private val _auctionBids = MutableStateFlow<Map<String, List<AuctionBid>>>(emptyMap())
    private val _wallets = MutableStateFlow<Map<String, WalletBalance>>(emptyMap())
    private val _walletLedgers = MutableStateFlow<Map<String, List<WalletLedgerEntry>>>(emptyMap())
    private val _virtualGifts = MutableStateFlow(DEFAULT_GIFTS)
    private val _videoComments = MutableStateFlow<Map<String, List<VideoComment>>>(emptyMap())
    private val _giftTransactions = MutableStateFlow<List<GiftTransaction>>(emptyList())

    fun observeLivestreamsState(): Flow<UiState<List<Livestream>>> =
        combine(_livestreams, _livestreamsError, _livestreamsLoaded) { list, err, loaded ->
            when {
                err != null && !loaded -> UiState.Error(err)
                err != null && list.isEmpty() -> UiState.Error(err)
                !loaded -> UiState.Loading
                else -> UiState.Success(list.filter { it.status == "live" || it.status == "scheduled" })
            }
        }

    fun observeAuctionsState(): Flow<UiState<List<Auction>>> =
        combine(_auctions, _auctionsError, _auctionsLoaded) { list, err, loaded ->
            when {
                err != null && !loaded -> UiState.Error(err)
                err != null && list.isEmpty() -> UiState.Error(err)
                !loaded -> UiState.Loading
                else -> UiState.Success(list.sortedBy { it.endsAtEpochMs })
            }
        }

    fun observeShortVideosState(): Flow<UiState<List<ShortVideo>>> =
        combine(_shortVideos, _videosError, _videosLoaded) { list, err, loaded ->
            when {
                err != null && !loaded -> UiState.Error(err)
                err != null && list.isEmpty() -> UiState.Error(err)
                !loaded -> UiState.Loading
                else -> UiState.Success(list.sortedByDescending { it.createdAtEpochMs })
            }
        }

    fun observeLivestreams(): Flow<List<Livestream>> =
        _livestreams.map { list -> list.filter { it.status == "live" || it.status == "scheduled" } }

    fun observeStreamMessages(streamId: String): Flow<List<StreamMessage>> =
        _streamMessages.map { it[streamId].orEmpty() }

    fun observeTopGifters(streamId: String): Flow<List<TopGifterEntry>> =
        _topGifters.map { map -> map[streamId].orEmpty().sortedByDescending { it.totalCoins } }

    fun observeAuctions(): Flow<List<Auction>> =
        _auctions.map { list -> list.sortedBy { it.endsAtEpochMs } }

    fun observeAuction(auctionId: String): Flow<Auction?> =
        _auctions.map { list -> list.find { it.id == auctionId } }

    fun observeAuctionBids(auctionId: String): Flow<List<AuctionBid>> =
        _auctionBids.map { map -> map[auctionId].orEmpty().sortedByDescending { it.amountNaira } }

    fun observeWallet(userId: String): Flow<WalletBalance> =
        _wallets.map { it[userId] ?: WalletBalance(userId = userId) }

    fun observeWalletLedger(userId: String): Flow<List<WalletLedgerEntry>> =
        _walletLedgers.map { map -> map[userId].orEmpty().sortedByDescending { it.createdAtEpochMs } }

    fun observeVirtualGifts(): Flow<List<VirtualGift>> = _virtualGifts

    fun observeShortVideos(): Flow<List<ShortVideo>> =
        _shortVideos.map { list -> list.sortedByDescending { it.createdAtEpochMs } }

    fun observeUserShortVideos(userId: String): Flow<List<ShortVideo>> =
        _shortVideos.map { list -> list.filter { it.sellerId == userId }.sortedByDescending { it.createdAtEpochMs } }

    fun observeVideoComments(videoId: String): Flow<List<VideoComment>> =
        _videoComments.map { map -> map[videoId].orEmpty().sortedByDescending { it.createdAtEpochMs } }

    fun observeGiftTransactionsForSeller(sellerId: String): Flow<List<GiftTransaction>> =
        _giftTransactions.map { list -> list.filter { it.sellerId == sellerId } }

    suspend fun ensureWalletInitialized(userId: String): Result<Unit> = runCatching {
        if (userId.isNotBlank() && !_wallets.value.containsKey(userId)) {
            _wallets.value = _wallets.value + (userId to WalletBalance(id = userId, userId = userId))
        }
        val remote = syncRepo ?: return@runCatching
        when (val streams = remote.fetchLivestreams()) {
            is CloudflareResult.Success -> {
                _livestreams.value = streams.data
                _livestreamsError.value = null
                _livestreamsLoaded.value = true
            }
            is CloudflareResult.Failure -> {
                _livestreamsError.value = streams.message
                if (!_livestreamsLoaded.value) _livestreamsLoaded.value = true
            }
        }
        when (val videos = remote.fetchVideos()) {
            is CloudflareResult.Success -> {
                _shortVideos.value = videos.data
                _videosError.value = null
                _videosLoaded.value = true
            }
            is CloudflareResult.Failure -> {
                _videosError.value = videos.message
                if (!_videosLoaded.value) _videosLoaded.value = true
            }
        }
        when (val auctions = remote.fetchAuctions()) {
            is CloudflareResult.Success -> {
                _auctions.value = auctions.data
                _auctionsError.value = null
                _auctionsLoaded.value = true
            }
            is CloudflareResult.Failure -> {
                _auctionsError.value = auctions.message
                if (!_auctionsLoaded.value) _auctionsLoaded.value = true
            }
        }
        if (userId.isNotBlank() && remote.currentSessionSnapshot().signedIn) {
            when (val coins = remote.fetchCoins()) {
                is CloudflareResult.Success -> {
                    _wallets.value = _wallets.value + (
                        userId to WalletBalance(
                            id = userId,
                            userId = userId,
                            purchasedCoins = coins.data.first
                        )
                    )
                    _walletLedgers.value = _walletLedgers.value + (userId to coins.data.second)
                }
                is CloudflareResult.Failure -> Unit
            }
        }
        Unit
    }

    suspend fun loadStreamComments(streamId: String) {
        val remote = syncRepo ?: return
        when (val res = remote.fetchLiveComments(streamId)) {
            is CloudflareResult.Success -> {
                _streamMessages.value = _streamMessages.value + (streamId to res.data)
            }
            is CloudflareResult.Failure -> Unit
        }
    }

    suspend fun loadVideoComments(videoId: String) {
        val remote = syncRepo ?: return
        when (val res = remote.fetchVideoComments(videoId)) {
            is CloudflareResult.Success -> {
                _videoComments.value = _videoComments.value + (videoId to res.data)
            }
            is CloudflareResult.Failure -> Unit
        }
    }

    suspend fun claimPromoTestCoins(userId: String, amount: Long = 250L): Result<Unit> = runCatching {
        throw IllegalStateException("Promotional coin grants are managed on the server ledger.")
    }

    suspend fun purchaseCoinsWithFlutterwave(
        userId: String,
        coins: Long,
        amountNaira: Long
    ): Result<String> = runCatching {
        val coinsEnabled = syncRepo?.currentStagingFlags()?.coinsPurchasesEnabled ?: false
        if (!coinsEnabled) {
            throw IllegalStateException("Cash Coins purchases are currently disabled (COINS_PURCHASES_ENABLED=false).")
        }
        throw IllegalStateException("Coin purchases require verified payment provider checkout.")
    }

    suspend fun sendVirtualGift(
        streamId: String,
        sellerId: String,
        senderId: String,
        senderName: String,
        gift: VirtualGift,
        usePromoCoins: Boolean,
        comboCount: Long
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to send gifts.")
        val requestId = "gift_${UUID.randomUUID().toString().take(12)}"
        when (val res = remote.sendGift(requestId, sellerId, gift.id)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                when (val coins = remote.fetchCoins()) {
                    is CloudflareResult.Success -> {
                        _wallets.value = _wallets.value + (
                            senderId to WalletBalance(id = senderId, userId = senderId, purchasedCoins = coins.data.first)
                        )
                        _walletLedgers.value = _walletLedgers.value + (senderId to coins.data.second)
                    }
                    is CloudflareResult.Failure -> Unit
                }
            }
        }
        Unit
    }

    suspend fun sendStreamMessage(
        streamId: String,
        userId: String,
        userName: String,
        text: String,
        isSystem: Boolean = false
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to comment in live rooms.")
        if (isSystem) throw IllegalStateException("System messages are server-managed")
        when (val sent = remote.sendLiveComment(streamId, text)) {
            is CloudflareResult.Failure -> throw IllegalStateException(sent.message)
            is CloudflareResult.Success -> {
                val cur = _streamMessages.value[streamId].orEmpty()
                _streamMessages.value = _streamMessages.value + (streamId to (listOf(sent.data) + cur))
            }
        }
        Unit
    }

    suspend fun deleteStreamMessage(streamId: String, messageId: String): Result<Unit> = runCatching {
        val cur = _streamMessages.value[streamId].orEmpty()
        _streamMessages.value = _streamMessages.value + (streamId to cur.filterNot { it.id == messageId })
        Unit
    }

    suspend fun likeLivestream(streamId: String): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to react to livestreams.")
        when (val res = remote.likeLivestream(streamId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _livestreams.value = _livestreams.value.map {
                    if (it.id == streamId) it.copy(likesCount = res.data) else it
                }
            }
        }
        Unit
    }

    suspend fun startSellerLivestream(
        sellerId: String,
        sellerName: String,
        title: String,
        category: String,
        qualityPreset: String,
        pinnedProduct: Product?
    ): Result<String> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Sign in as an approved seller to start a livestream.")
        if (!remote.currentSessionSnapshot().isApprovedSeller) {
            throw IllegalStateException("Only approved sellers can start a livestream.")
        }
        if (!remote.currentStagingFlags().liveStreamingConfigured) {
            throw IllegalStateException("Live video broadcasting is not configured on this server yet.")
        }
        when (val res = remote.createLivestream(title, category, pinnedProduct?.id)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                val stream = res.data.copy(
                    pinnedProductTitle = pinnedProduct?.title.orEmpty(),
                    pinnedProductPriceNaira = pinnedProduct?.priceNaira ?: 0L,
                    qualityPreset = qualityPreset
                )
                _livestreams.value = listOf(stream) + _livestreams.value
                stream.id
            }
        }
    }

    suspend fun pinProductToLivestream(streamId: String, product: Product): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Sign in to pin products.")
        when (val res = remote.pinStreamProduct(streamId, product.id)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _livestreams.value = _livestreams.value.map {
                    if (it.id == streamId) {
                        it.copy(
                            pinnedProductId = product.id,
                            pinnedProductTitle = product.title,
                            pinnedProductPriceNaira = product.priceNaira
                        )
                    } else it
                }
            }
        }
        Unit
    }

    suspend fun launchLiveFlashDeal(
        streamId: String,
        productId: String,
        discountPercent: Long
    ): Result<Unit> = runCatching {
        throw IllegalStateException("Live flash deal pricing must be updated on the server catalog.")
    }

    suspend fun endLivestream(streamId: String): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Live actions require server connectivity")
        when (val ended = remote.endLivestream(streamId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(ended.message)
            is CloudflareResult.Success -> if (!ended.data) throw IllegalStateException("Stream end not confirmed")
        }
        _livestreams.value = _livestreams.value.map {
            if (it.id == streamId) it.copy(status = "ended") else it
        }
        Unit
    }

    suspend fun createLiveAuction(
        sellerId: String,
        sellerName: String,
        product: Product,
        startingBidNaira: Long,
        minIncrementNaira: Long,
        durationMinutes: Long
    ): Result<String> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Sign in as an approved seller to create auctions.")
        if (!remote.currentSessionSnapshot().isApprovedSeller) {
            throw IllegalStateException("Only approved sellers can create auctions.")
        }
        when (val res = remote.createAuction(product.id, startingBidNaira, durationMinutes)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                when (val updated = remote.fetchAuctions()) {
                    is CloudflareResult.Success -> _auctions.value = updated.data
                    is CloudflareResult.Failure -> Unit
                }
                res.data
            }
        }
    }

    suspend fun placeAuctionBid(
        auctionId: String,
        bidderId: String,
        bidderName: String,
        bidAmountNaira: Long
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to place auction bids.")
        when (val res = remote.placeBid(auctionId, bidAmountNaira)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _auctions.value = _auctions.value.map {
                    if (it.id == auctionId) {
                        it.copy(
                            currentBidNaira = res.data,
                            highestBidderId = bidderId,
                            highestBidderName = bidderName.ifBlank { "You" },
                            bidCount = it.bidCount + 1L
                        )
                    } else it
                }
            }
        }
        Unit
    }

    suspend fun finalizeWonAuctionOrder(
        auction: Auction,
        buyerId: String,
        deliveryState: String,
        deliveryAddress: String
    ): Result<String> = runCatching {
        val paymentsEnabled = syncRepo?.currentStagingFlags()?.paymentsEnabled ?: false
        if (!paymentsEnabled) {
            throw IllegalStateException("Auction checkout is disabled while PAYMENTS_ENABLED=false.")
        }
        throw IllegalStateException("Auction settlement requires server payment authorization.")
    }

    suspend fun likeShortVideo(videoId: String): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to like videos.")
        when (val res = remote.likeVideo(videoId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _shortVideos.value = _shortVideos.value.map {
                    if (it.id == videoId) {
                        it.copy(likedByViewer = res.data.first, likesCount = res.data.second)
                    } else it
                }
            }
        }
        Unit
    }

    suspend fun commentOnShortVideo(
        videoId: String,
        userId: String,
        userName: String,
        text: String
    ): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Please sign in to comment on videos.")
        when (val saved = remote.commentVideo(videoId, text)) {
            is CloudflareResult.Failure -> throw IllegalStateException(saved.message)
            is CloudflareResult.Success -> {
                _videoComments.value = _videoComments.value + (
                    videoId to (listOf(saved.data) + _videoComments.value[videoId].orEmpty())
                )
                _shortVideos.value = _shortVideos.value.map {
                    if (it.id == videoId) it.copy(commentsCount = it.commentsCount + 1L) else it
                }
            }
        }
        Unit
    }

    suspend fun uploadShortVideo(
        contentResolver: ContentResolver,
        videoUri: Uri,
        title: String,
        caption: String,
        product: Product,
        cacheDir: File,
        onProgress: (Float) -> Unit
    ): Result<ShortVideo> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Sign in as an approved seller to upload videos.")
        if (!remote.currentSessionSnapshot().isApprovedSeller) {
            throw IllegalStateException("Only verified, approved sellers can upload shoppable videos.")
        }
        when (
            val res = remote.uploadShortVideoWithProgress(
                contentResolver = contentResolver,
                videoUri = videoUri,
                title = title,
                caption = caption,
                productId = product.id,
                cacheDir = cacheDir,
                onProgress = onProgress
            )
        ) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                val created = res.data.copy(
                    productTitle = product.title,
                    productPriceNaira = product.priceNaira,
                    productImageUrl = product.imageKey,
                    category = product.category
                )
                _shortVideos.value = listOf(created) + _shortVideos.value
                created
            }
        }
    }

    suspend fun deleteShortVideo(videoId: String): Result<Unit> = runCatching {
        val remote = syncRepo ?: throw IllegalStateException("Sign in required.")
        when (val res = remote.deleteVideo(videoId)) {
            is CloudflareResult.Failure -> throw IllegalStateException(res.message)
            is CloudflareResult.Success -> {
                _shortVideos.value = _shortVideos.value.filterNot { it.id == videoId }
            }
        }
        Unit
    }

    companion object {
        val DEFAULT_GIFTS = listOf(
            VirtualGift(id = "rose", name = "Lagos Rose", category = "Starter", coinCost = 10L, animationType = "float", colorHex = "#E11D48"),
            VirtualGift(id = "star", name = "Naira Star", category = "Popular", coinCost = 100L, animationType = "burst", colorHex = "#059669"),
            VirtualGift(id = "lion", name = "Eko Lion", category = "VIP Fullscreen", coinCost = 1000L, animationType = "fullscreen", colorHex = "#F59E0B")
        )
    }
}
