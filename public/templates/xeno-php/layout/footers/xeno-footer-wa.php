                </main>
                <!--====== Start Footer Area ======-->
                <footer class="xeno-footer-wa">
                    <div class="shape shape-one"><span><img src="assets/images/website-agency/footer/shape1.png" class="rotate360" alt="shape"></span></div>
                    <div class="shape shape-two"><span><img src="assets/images/website-agency/footer/shape1.png"  class="rotate360" alt="shape"></span></div>
                    <!-- Footer Top -->
                    <div class="footer-top">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-12">
                                    <div class="xeno-content-box">
                                        <h2 class="text-anm">Let’s Work Together for <br> your next project!</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Footer Widget Area -->
                    <div class="footer-widget-area">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-contact-widget mb-40" data-aos="fade-up" data-aos-duration="1400">
                                        <h4 class="widget-title">Email Us</h4>
                                        <div class="footer-content">
                                            <p><a href="mailto:example@gmail.com">example@gmail.com</a></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-contact-widget mb-40" data-aos="fade-up" data-aos-duration="1400">
                                        <h4 class="widget-title">Phone No</h4>
                                        <div class="footer-content">
                                            <p><a href="tel:+1(234)5680000">+1 (234) 568 0000</a></p>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 col-sm-12">
                                    <!--=== Footer Widget ===-->
                                    <div class="footer-widget footer-contact-widget mb-40" data-aos="fade-up" data-aos-duration="1400">
                                        <h4 class="widget-title">Location</h4>
                                        <div class="footer-content">
                                            <p>55 East 10th Street, USA</p>
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
                                            <li><a href="index-marketing-agency.php">Home</a></li>
                                            <li><a href="about.php">About</a></li>
                                            <li><a href="contact.php">Privacy Policy</a></li>
                                            <li><a href="contact.php">Contact</a></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer><!--====== End Footer Area ======-->
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
        <!--====== Common js ======-->
        <script src="assets/js/common.js"></script>
        <?php if (isset($special_js)) : ?>
        <!--====== Page specific js ======-->
        <script src="assets/js/<?php echo $special_js; ?>.js"></script>    
        <?php endif ?>
    </body>
</html>