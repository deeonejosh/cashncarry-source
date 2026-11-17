package com.example.ui.viewmodel

import android.content.ContentResolver
import android.net.Uri
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.model.Auction
import com.example.data.model.AuctionBid
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
import com.example.data.repository.AdminRepository
import com.example.data.repository.LiveCommerceRepository
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.io.File

data class GiftAnimationBanner(
    val id: Long,
    val senderName: String,
    val giftName: String,
    val coinCost: Long,
    val comboCount: Long,
    val animationType: String
)

@OptIn(ExperimentalCoroutinesApi::class)
class LiveCommerceViewModel(
    private val liveRepo: LiveCommerceRepository,
    private val adminRepo: AdminRepository,
    val currentUserId: String,
    val currentUserName: String
) : ViewModel() {

    val livestreamsState: StateFlow<UiState<List<Livestream>>> =
        liveRepo.observeLivestreamsState()
            .catch { emit(UiState.Error(unwrapMessage(it, "Failed to load livestreams"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val auctionsState: StateFlow<UiState<List<Auction>>> =
        liveRepo.observeAuctionsState()
            .catch { emit(UiState.Error(unwrapMessage(it, "Failed to load auctions"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val shortVideosState: StateFlow<UiState<List<ShortVideo>>> =
        liveRepo.observeShortVideosState()
            .catch { emit(UiState.Error(unwrapMessage(it, "Failed to load video feed"))) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), UiState.Loading)

    val userShortVideos: StateFlow<List<ShortVideo>> =
        liveRepo.observeUserShortVideos(currentUserId)
            .catch { emit(emptyList()) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val walletState: StateFlow<WalletBalance> =
        liveRepo.observeWallet(currentUserId)
            .catch { emit(WalletBalance(userId = currentUserId)) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), WalletBalance(userId = currentUserId))

    val walletLedgerState: StateFlow<List<WalletLedgerEntry>> =
        liveRepo.observeWalletLedger(currentUserId)
            .catch { emit(emptyList()) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val virtualGifts: StateFlow<List<VirtualGift>> =
        liveRepo.observeVirtualGifts()
            .catch { emit(LiveCommerceRepository.DEFAULT_GIFTS) }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), LiveCommerceRepository.DEFAULT_GIFTS)

    private val _activeStreamId = MutableStateFlow<String?>(null)
    val activeStreamId: StateFlow<String?> = _activeStreamId.asStateFlow()

    private val _minimizedStreamId = MutableStateFlow<String?>(null)
    val minimizedStreamId: StateFlow<String?> = _minimizedStreamId.asStateFlow()

    val activeStreamMessages: StateFlow<List<StreamMessage>> =
        _activeStreamId.flatMapLatest { id ->
            if (id.isNullOrBlank()) flowOf(emptyList())
            else liveRepo.observeStreamMessages(id).catch { emit(emptyList()) }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    val activeTopGifters: StateFlow<List<TopGifterEntry>> =
        _activeStreamId.flatMapLatest { id ->
            if (id.isNullOrBlank()) flowOf(emptyList())
            else liveRepo.observeTopGifters(id).catch { emit(emptyList()) }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    private val _activeAuctionId = MutableStateFlow<String?>(null)
    val activeAuctionBids: StateFlow<List<AuctionBid>> =
        _activeAuctionId.flatMapLatest { id ->
            if (id.isNullOrBlank()) flowOf(emptyList())
            else liveRepo.observeAuctionBids(id).catch { emit(emptyList()) }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    private val _activeVideoId = MutableStateFlow<String?>(null)
    val activeVideoComments: StateFlow<List<VideoComment>> =
        _activeVideoId.flatMapLatest { id ->
            if (id.isNullOrBlank()) flowOf(emptyList())
            else liveRepo.observeVideoComments(id).catch { emit(emptyList()) }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000L), emptyList())

    private val _usePromoCoins = MutableStateFlow(false)
    val usePromoCoins: StateFlow<Boolean> = _usePromoCoins.asStateFlow()

    private val _giftBanner = MutableStateFlow<GiftAnimationBanner?>(null)
    val giftBanner: StateFlow<GiftAnimationBanner?> = _giftBanner.asStateFlow()

    private val _statusBanner = MutableStateFlow<String?>(null)
    val statusBanner: StateFlow<String?> = _statusBanner.asStateFlow()

    private val _isUploadingVideo = MutableStateFlow(false)
    val isUploadingVideo: StateFlow<Boolean> = _isUploadingVideo.asStateFlow()

    private val _videoUploadProgress = MutableStateFlow(0f)
    val videoUploadProgress: StateFlow<Float> = _videoUploadProgress.asStateFlow()

    private val _videoUploadError = MutableStateFlow<String?>(null)
    val videoUploadError: StateFlow<String?> = _videoUploadError.asStateFlow()

    private var lastGiftId: String? = null
    private var lastGiftTimestampMs: Long = 0L
    private var comboStreak: Long = 1L

    init {
        refreshLiveCommerce()
    }

    fun refreshLiveCommerce() {
        viewModelScope.launch {
            liveRepo.ensureWalletInitialized(currentUserId)
        }
    }

    fun openStream(streamId: String) {
        _activeStreamId.value = streamId
        _minimizedStreamId.value = null
        viewModelScope.launch {
            liveRepo.loadStreamComments(streamId)
        }
    }

    fun minimizeStream(streamId: String) {
        _minimizedStreamId.value = streamId
        _activeStreamId.value = streamId
    }

    fun dismissMiniPlayer() {
        _minimizedStreamId.value = null
    }

    fun selectAuction(auctionId: String) {
        _activeAuctionId.value = auctionId
    }

    fun selectVideoForComments(videoId: String) {
        _activeVideoId.value = videoId
        viewModelScope.launch {
            liveRepo.loadVideoComments(videoId)
        }
    }

    fun setUsePromoCoins(usePromo: Boolean) {
        _usePromoCoins.value = usePromo
    }

    fun sendChatMessage(streamId: String, text: String) {
        if (currentUserId.isBlank()) {
            _statusBanner.value = "Please sign in to chat in live rooms."
            return
        }
        if (text.isBlank()) return
        viewModelScope.launch {
            liveRepo.sendStreamMessage(streamId, currentUserId, currentUserName, text)
                .onFailure { _statusBanner.value = it.message ?: "Message failed" }
        }
    }

    fun moderateDeleteMessage(streamId: String, messageId: String) {
        viewModelScope.launch {
            liveRepo.deleteStreamMessage(streamId, messageId)
                .onSuccess { _statusBanner.value = "Comment removed by moderator" }
        }
    }

    fun sendLike(streamId: String) {
        if (currentUserId.isBlank()) {
            _statusBanner.value = "Please sign in to react to livestreams."
            return
        }
        viewModelScope.launch {
            liveRepo.likeLivestream(streamId)
                .onFailure { _statusBanner.value = it.message ?: "Like failed" }
        }
    }

    fun claimPromoCoins() {
        viewModelScope.launch {
            liveRepo.claimPromoTestCoins(currentUserId, 250L)
                .onFailure { _statusBanner.value = it.message ?: "Could not claim promo coins" }
        }
    }

    fun buyCoins(coins: Long, priceNaira: Long) {
        viewModelScope.launch {
            liveRepo.purchaseCoinsWithFlutterwave(currentUserId, coins, priceNaira)
                .onSuccess { _statusBanner.value = "Purchased $coins Cash Coins" }
                .onFailure { _statusBanner.value = it.message ?: "Coin purchases are currently disabled." }
        }
    }

    fun sendGift(stream: Livestream, gift: VirtualGift) {
        if (currentUserId.isBlank()) {
            _statusBanner.value = "Please sign in to send gifts."
            return
        }
        val now = System.currentTimeMillis()
        comboStreak = if (lastGiftId == gift.id && now - lastGiftTimestampMs < 6000L) {
            comboStreak + 1L
        } else {
            1L
        }
        lastGiftId = gift.id
        lastGiftTimestampMs = now

        val usePromo = _usePromoCoins.value
        viewModelScope.launch {
            liveRepo.sendVirtualGift(
                streamId = stream.id,
                sellerId = stream.sellerId,
                senderId = currentUserId,
                senderName = currentUserName,
                gift = gift,
                usePromoCoins = usePromo,
                comboCount = comboStreak
            ).onSuccess {
                _giftBanner.value = GiftAnimationBanner(
                    id = now,
                    senderName = currentUserName.ifBlank { "You" },
                    giftName = gift.name,
                    coinCost = gift.coinCost,
                    comboCount = comboStreak,
                    animationType = gift.animationType
                )
            }.onFailure {
                _statusBanner.value = it.message ?: "Gift failed"
            }
        }
    }

    fun clearGiftBanner() {
        _giftBanner.value = null
    }

    fun placeBid(auction: Auction, bidAmountNaira: Long) {
        if (currentUserId.isBlank()) {
            _statusBanner.value = "Please sign in to place auction bids."
            return
        }
        viewModelScope.launch {
            liveRepo.placeAuctionBid(auction.id, currentUserId, currentUserName, bidAmountNaira)
                .onSuccess { _statusBanner.value = "Highest bid placed: ₦$bidAmountNaira" }
                .onFailure { _statusBanner.value = it.message ?: "Bid rejected" }
        }
    }

    fun claimWonAuction(auction: Auction, deliveryState: String, deliveryAddress: String, onOrderCreated: (String) -> Unit) {
        viewModelScope.launch {
            liveRepo.finalizeWonAuctionOrder(auction, currentUserId, deliveryState, deliveryAddress)
                .onSuccess { orderId ->
                    _statusBanner.value = "Winning order generated! Complete payment in Orders."
                    onOrderCreated(orderId)
                }
                .onFailure { _statusBanner.value = it.message ?: "Could not generate auction order" }
        }
    }

    fun likeShortVideo(videoId: String) {
        if (currentUserId.isBlank()) {
            _statusBanner.value = "Please sign in to like videos."
            return
        }
        viewModelScope.launch {
            liveRepo.likeShortVideo(videoId)
                .onFailure { _statusBanner.value = it.message ?: "Could not update like" }
        }
    }

    fun commentShortVideo(videoId: String, text: String) {
        if (currentUserId.isBlank()) {
            _statusBanner.value = "Please sign in to comment on videos."
            return
        }
        if (text.isBlank()) return
        viewModelScope.launch {
            liveRepo.commentOnShortVideo(videoId, currentUserId, currentUserName, text)
                .onFailure { _statusBanner.value = it.message ?: "Could not post comment" }
        }
    }

    fun uploadVideoFile(
        contentResolver: ContentResolver,
        videoUri: Uri,
        title: String,
        caption: String,
        product: Product,
        cacheDir: File,
        onUploaded: () -> Unit = {}
    ) {
        if (currentUserId.isBlank()) {
            _videoUploadError.value = "Sign in as an approved seller to upload videos."
            return
        }
        viewModelScope.launch {
            _isUploadingVideo.value = true
            _videoUploadProgress.value = 0.02f
            _videoUploadError.value = null
            liveRepo.uploadShortVideo(
                contentResolver = contentResolver,
                videoUri = videoUri,
                title = title,
                caption = caption,
                product = product,
                cacheDir = cacheDir,
                onProgress = { progress -> _videoUploadProgress.value = progress }
            ).onSuccess {
                _isUploadingVideo.value = false
                _videoUploadProgress.value = 1f
                _statusBanner.value = "Video uploaded and published to For You feed!"
                onUploaded()
            }.onFailure { err ->
                _isUploadingVideo.value = false
                _videoUploadProgress.value = 0f
                _videoUploadError.value = err.message ?: "Video upload failed"
            }
        }
    }

    fun clearVideoUploadState() {
        _videoUploadError.value = null
        _videoUploadProgress.value = 0f
    }

    fun deleteShortVideo(videoId: String) {
        viewModelScope.launch {
            liveRepo.deleteShortVideo(videoId)
                .onSuccess { _statusBanner.value = "Video deleted" }
                .onFailure { _statusBanner.value = it.message ?: "Could not delete video" }
        }
    }

    fun reportLivestream(streamId: String, reason: String) {
        viewModelScope.launch {
            adminRepo.fileReportOrDispute(currentUserId, "livestream", streamId, reason)
                .onSuccess { _statusBanner.value = "Stream report submitted to Trust & Safety." }
                .onFailure { _statusBanner.value = it.message ?: "Failed to report" }
        }
    }

    fun startBroadcast(
        title: String,
        category: String,
        qualityPreset: String,
        pinnedProduct: Product?,
        onStarted: (String) -> Unit
    ) {
        viewModelScope.launch {
            liveRepo.startSellerLivestream(
                sellerId = currentUserId,
                sellerName = currentUserName,
                title = title,
                category = category,
                qualityPreset = qualityPreset,
                pinnedProduct = pinnedProduct
            ).onSuccess { streamId ->
                _activeStreamId.value = streamId
                onStarted(streamId)
            }.onFailure {
                _statusBanner.value = it.message ?: "Failed to start broadcast"
            }
        }
    }

    fun pinProduct(streamId: String, product: Product) {
        viewModelScope.launch {
            liveRepo.pinProductToLivestream(streamId, product)
                .onSuccess { _statusBanner.value = "Pinned ${product.title}" }
                .onFailure { _statusBanner.value = it.message ?: "Failed to pin product" }
        }
    }

    fun triggerFlashDeal(streamId: String, productId: String, discountPercent: Long) {
        viewModelScope.launch {
            liveRepo.launchLiveFlashDeal(streamId, productId, discountPercent)
                .onFailure { _statusBanner.value = it.message ?: "Flash deal update failed" }
        }
    }

    fun endBroadcast(streamId: String, onEnded: () -> Unit) {
        viewModelScope.launch {
            liveRepo.endLivestream(streamId)
                .onSuccess {
                    if (_minimizedStreamId.value == streamId) _minimizedStreamId.value = null
                    onEnded()
                }
                .onFailure { _statusBanner.value = it.message ?: "Could not end stream" }
        }
    }

    fun clearStatusBanner() {
        _statusBanner.value = null
    }

    private fun unwrapMessage(error: Throwable, fallback: String): String {
        if (error is CancellationException) throw error
        Log.w(TAG, fallback, error)
        return error.message ?: fallback
    }

    private companion object {
        const val TAG = "LiveCommerceVM"
    }
}
