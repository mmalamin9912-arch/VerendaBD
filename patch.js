const fs = require('fs');
let code = fs.readFileSync('src/components/ThemeCustomizerModal.tsx', 'utf-8');

const replacement = `
    if (merchant && onPublish) {
      const themeConfig = {
        storeLogoText, logoImageUrl, desktopLogoUrl, mobileLogoUrl, logoHeight,
        headerSticky, headerBgColor, hideLanguage, hideCountry,
        showAnnouncement, announcementText, announcementBg, announcementLink, isMarquee, marqueeSpeed, announcementItems,
        showHeroBanner, carouselTransition, desktopCarouselHeight, mobileCarouselHeight, activeSlideIndex, slides, heroTitle, heroSubtitle, heroCtaText, heroImage,
        showCategories, categoriesHeading, categoriesSubtitle, categoriesLayout, categoriesSelection, categoriesItemsPerRow, categoriesShowItemCount, categoriesMoreButtonText, categoriesShowMoreButton, categoriesBgImage, categoriesOverlayOpacity, categoriesList,
        showFeaturedGrid, featuredHeading, productColumns,
        showCountdown, countdownTitle, countdownEndDate, countdownBgImage, countdownOverlayOpacity, countdownHours, countdownDiscount,
        showGallery, galleryHeading, galleryImages,
        showSocialBlock, socialTagline, facebookHandle, instagramHandle, whatsappNumber, tiktokHandle, youtubeHandle, showFacebook, showInstagram, showWhatsapp, showTikTok, showYouTube, socialButtonStyle,
        showVideo, videoTitle, videoUrl, videoCoverImage, videoFileUrl, videoAutoplay, videoMuted,
        footerLogoText, footerTagline, footerLinksTitle, footerLinks, footerAboutText, dhakaAddress, contactPhone, contactEmail, showPaymentBadges
      };

      const updatedMerchant: MerchantProfile = {
        ...merchant,
        storeName: storeLogoText,
        heroTitle,
        heroSubtitle,
        heroImage,
        announcementText,
        themeConfig,
      };
      onPublish(updatedMerchant);
    }
`;

code = code.replace(/if \(merchant && onPublish\) \{[\s\S]*?onPublish\(updatedMerchant\);\s*\}/, replacement.trim());

fs.writeFileSync('src/components/ThemeCustomizerModal.tsx', code);
