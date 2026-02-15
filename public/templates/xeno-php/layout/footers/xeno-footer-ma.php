            </main>
                <!--====== Start Footer ======-->
                <footer class="xeno-footer-ma bg_cover" style="background-image: url(assets/images/marketing-agency/footer/footer-bg.jpg);">
                    <div class="footer-widget-area pt-70 pb-55">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-3 col-md-6">
                                    <!-- Footer Widget -->
                                    <div class="footer-widget footer-about-widget mb-40" data-aos="fade-up" data-aos-duration="1000">
                                        <div class="footer-content">
                                            <div class="footer-logo">
                                                <img src="assets/images/marketing-agency/logo/logo-white.png" alt="Logo">
                                            </div>
                                            <p>We specialize in social media strategy, content creation, SEO
                                                and targeted advertising.</p>
                                            <div class="social-box">
                                                <a href="#"><i class="fab fa-facebook-f"></i></a>
                                                <a href="#"><i class="fab fa-twitter"></i></a>
                                                <a href="#"><i class="fab fa-linkedin-in"></i></a>
                                                <a href="#"><i class="fab fa-instagram"></i></a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-4 col-md-6">
                                    <!-- Footer Widget -->
                                    <div class="footer-widget footer-nav-widget mb-20" data-aos="fade-up" data-aos-duration="1200">
                                        <h4 class="widget-title">Company</h4>
                                        <div class="footer-content">
                                            <div class="row">
                                                <div class="col-md-6">
                                                    <ul class="widget-nav mb-20">
                                                        <li><a href="#">About Company</a></li>
                                                        <li><a href="#">Need a Careers</a></li>
                                                        <li><a href="#">Pricing Package</a></li>
                                                        <li><a href="#">Contact Us</a></li>
                                                        <li><a href="#">System Status</a></li>
                                                    </ul>
                                                </div>
                                                <div class="col-md-6">
                                                    <ul class="widget-nav mb-20">
                                                        <li><a href="#">AI Data Driven</a></li>
                                                        <li><a href="#">Software</a></li>
                                                        <li><a href="#">Mobile Apps</a></li>
                                                        <li><a href="#">Dashboard</a></li>
                                                        <li><a href="#">Landing Pages</a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-5 col-md-6">
                                    <!-- Footer Widget -->
                                    <div class="footer-widget footer-newsletter-widget mb-40" data-aos="fade-up" data-aos-duration="1400">
                                        <div class="footer-content">
                                            <h3>Subscribe our newsletter
                                                to get more updates</h3>
                                            <form>
                                                <div class="form-group">
                                                    <input type="email" class="form_control" placeholder="Email address" name="name" required>
                                                    <button class="submit-btn"><i class="far fa-envelope"></i></button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Footer Copyright -->
                    <div class="footer-copyright">
                        <div class="container">
                            <div class="row">
                                <div class="col-md-6">
                                    <!-- Copyright Text -->
                                    <div class="copyright-text">
                                        <p>&copy; <span><?php echo date("Y"); ?> Xeno.</span> - All rights reserved.</p>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <!-- Copyright Nav -->
                                    <div class="copyright-nav">
                                        <ul>
                                            <li><a href="#">Home</a></li>
                                            <li><a href="#">Contact</a></li>
                                            <li><a href="#">FAQs</a></li>
                                            <li><a href="#">Setting</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer><!--====== End Footer ======-->
            </div>
        </div>
        <!--====== Jquery js ======-->
        <script src="assets/js/plugins/jquery-3.7.1.min.js"></script>
        <!--====== Bootstrap js ======-->
        <script src="assets/js/plugins/popper.min.js"></script>
        <!--====== Bootstrap js ======-->
        <script src="assets/js/plugins/bootstrap.min.js"></script>
        <!--====== Gsap Js ======-->
        <script src="assets/js/plugins/gsap/gsap.min.js"></script>
        <script src="assets/js/plugins/gsap/SplitText.min.js"></script>
        <script src="assets/js/plugins/gsap/ScrollSmoother.min.js"></script>
        <script src="assets/js/plugins/gsap/ScrollTrigger.min.js"></script>
        <!--====== Waypoint js ======-->
        <script src="assets/js/plugins/jquery.waypoints.js"></script>
        <!--====== CounterUp js ======-->
        <script src="assets/js/plugins/jquery.counterup.min.js"></script>
        <!--====== Slick js ======-->
        <script src="assets/js/plugins/slick.min.js"></script>
        <!--====== Magnific js ======-->
        <script src="assets/js/plugins/jquery.magnific-popup.min.js"></script>
        <!--====== AOS js ======-->
        <script src="assets/js/plugins/aos.js"></script>
        <!--====== Main js ======-->
        <script src="assets/js/common.js"></script>
        <?php if (isset($special_js)) : ?>
        <!--====== Page specific js ======-->
        <script src="assets/js/<?php echo $special_js; ?>.js"></script>    
        <?php endif ?>
    </body>
</html>