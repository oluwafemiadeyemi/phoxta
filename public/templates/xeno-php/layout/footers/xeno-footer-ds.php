                </main>
                <!--====== Start Footer ======-->
                <footer class="xeno-footer-ds">
                    <!-- Footer Top -->
                    <div class="footer-top">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-8">
                                    <!-- Section Title -->
                                    <div class="xeno-content-box mb-40" data-aos="fade-up" data-aos-duration="1000">
                                        <h2>Let’s Start a Project!</h2>
                                        <p>Experience & professional design studio</p>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <!-- Xeno Button -->
                                    <div class="xeno-button float-lg-end mb-50" data-aos="fade-up" data-aos-duration="1200">
                                        <a href="contact.php" class="theme-btn style-one">Let’s Work Together</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Footer Widget -->
                    <div class="footer-widget-area">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-newsletter-widget mb-40" data-aos="fade-up" data-aos-duration="1200">
                                        <div class="footer-content">
                                            <h4 class="widget-title">Services</h4>
                                            <form autocomplete="off">
                                                <input type="email" class="form_control" placeholder="Email Address" name="email" required>
                                                <button class="theme-btn">Subscribe <i class="far fa-paper-plane"></i></button>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-contact-widget mb-40" data-aos="fade-up" data-aos-duration="1400">
                                        <h4 class="widget-title">Location</h4>
                                        <div class="footer-content">
                                            <p>55 East 10th Street, New York, NY 10003, United States</p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-contact-widget mb-40" data-aos="fade-up" data-aos-duration="1600">
                                        <h4 class="widget-title">Get In Touch</h4>
                                        <div class="footer-content">
                                            <p><a href="mailto:supportxeno@gmail.com">supportxeno@gmail.com</a></p>
                                            <p><a href="tel:+1(234)5689900">+1 (234) 568 9900</a></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-social-widget mb-40" data-aos="fade-up" data-aos-duration="1800">
                                        <div class="footer-content">
                                            <h4 class="widget-title">Social Media</h4>
                                            <div class="social-box">
                                                <a href="#"><i class="fab fa-facebook-f"></i></a>
                                                <a href="#"><i class="fab fa-youtube"></i></a>
                                                <a href="#"><i class="fab fa-pinterest"></i></a>
                                                <a href="#"><i class="fab fa-twitter"></i></a>
                                                <a href="#"><i class="fab fa-linkedin-in"></i></a>
                                            </div>
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
                                            <li><a href="#">About</a></li>
                                            <li><a href="#">Privacy Policy</a></li>
                                            <li><a href="#">Contact</a></li>
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