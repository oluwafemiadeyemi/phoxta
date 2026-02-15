<!DOCTYPE html>
<html lang="zxx">
    <head>
        <!--====== Required meta tags ======-->
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="description" content="creative Agency, design studio, web agency, marketing agency">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <!--====== Title ======-->
        <title><?php echo isset($site_title) ? $site_title : "Xeno - Startup & Agency PHP Templatete"; ?></title>
        <!--====== Favicon Icon ======-->
        <link rel="shortcut icon" href="assets/images/marketing-agency/favicon.png" type="image/png">
        <!--====== Google Fonts ======-->
        <link href="https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,300..900;1,300..900&family=Sora:wght@100..800&display=swap" rel="stylesheet">
        <!--====== Flaticon css ======-->
        <link rel="stylesheet" href="assets/fonts/flaticon/flaticon_xeno.css">
        <!--====== FontAwesome css ======-->
        <link rel="stylesheet" href="assets/fonts/fontawesome/css/all.min.css">
        <!--====== Bootstrap css ======-->
        <link rel="stylesheet" href="assets/css/plugins/bootstrap.min.css">
        <!--====== Slick-popup css ======-->
        <link rel="stylesheet" href="assets/css/plugins/slick.css">
        <!--====== Magnific-popup css ======-->
        <link rel="stylesheet" href="assets/css/plugins/magnific-popup.css">
        <!--====== AOS Animation ======-->
        <link rel="stylesheet" href="assets/css/plugins/aos.css">
        <!--====== Spacings css ======-->
        <link rel="stylesheet" href="assets/css/spacings.css">
        <!--====== Common Style css ======-->
        <link rel="stylesheet" href="assets/css/common-style.css">
        <?php if (isset($special_css)) : ?>
        <!--====== Style css ======-->
        <link rel="stylesheet" href="assets/css/pages/<?php echo $special_css; ?>.css">
        <?php endif ?>
    </head>
        <body <?php echo (isset($body_class) && ("" !== $body_class)) ? 'class="' . $body_class .'"'   : ''; ?>>
        <!--====== Preloader ======-->
        <div class="preloader">
            <div class="loading-wrapper">
                <div class="loading"></div>
                <div id="loading-icon"><img src="assets/images/marketing-agency/loader.png" alt=""></div>
            </div>
        </div>
        <!--====== Start Overlay ======-->
        <div class="offcanvas__overlay"></div>
        <!--======  Start Header Area  ======-->
        <header class="header-area header-four transparent-header">
            <div class="container-fluid">
                <!--====  Header Navigation  ===-->
                <div class="header-navigation">
                    <!--====  Header Nav Inner  ===-->
                    <div class="nav-inner-menu">
                        <!--====  Primary Menu  ===-->
                        <div class="primary-menu">
                            <!--====  Site Branding  ===-->
                            <div class="site-branding">
                                <a href="index.php" class="brand-logo"><img src="assets/images/marketing-agency/logo/logo-white.png" alt="Brand Logo"></a>
                            </div>
                            <!--=== Xeno Main Menu ===-->
                            <div class="xeno-nav-menu">
                                <!-- Xeno Menu Top -->
                                <div class="xeno-menu-top d-flex justify-content-between d-block d-lg-none">
                                    <div class="site-branding">
                                        <a href="index.php" class="brand-logo"><img src="assets/images/design-studio/logo/logo-main.png" alt="Brand Logo"></a>
                                    </div>
                                    <div class="navbar-close">
                                        <i class="far fa-times"></i>
                                    </div>
                                </div>
                                <!--=== Main Menu ===-->
                                <?php include_once 'layout/headers/main-menu.php'; ?>
                                <!--=== Xeno Nav Button ===-->
                                <div class="xeno-nav-button mt-20 d-block d-md-none">
                                    <a href="contact.php" class="theme-btn style-one">Get In Touch<i class="far fa-angle-double-right"></i></a>
                                </div>
                                <!--=== Xeno Menu Bottom ===-->
                                <div class="xeno-menu-bottom mt-50 d-block d-lg-none">
                                    <h5>Follow Us</h5>
                                    <ul class="social-link">
                                        <li><a href="#"><i class="fab fa-facebook-f"></i></a></li>
                                        <li><a href="#"><i class="fab fa-twitter"></i></a></li>
                                        <li><a href="#"><i class="fab fa-linkedin-in"></i></a></li>
                                        <li><a href="#"><i class="fab fa-youtube"></i></a></li>
                                    </ul>
                                </div>
                            </div>
                            <!--=== Header Nav Right ===-->
                            <div class="nav-right-item">
                                <div class="nav-button d-none d-md-block">
                                    <a href="contact.php" class="theme-btn style-one">Get In Touch<i class="far fa-angle-double-right"></i></a>
                                </div>
                                <div class="navbar-toggler">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header><!--======  End Header Area  ======-->
        <div id="smooth-wrapper">
            <div id="smooth-content">
                <main>