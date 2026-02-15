<?php
$site_title = 'Contact | Xeno - Startup & Agency PHP Templatete';
$special_css = 'innerpages';
$special_js = 'innerpage';
$body_class = 'xeno-inner-page';
$page_sub_title = 'Contact Us';
$page_title = 'Get In Touch';
require_once 'layout/headers/header-one.php';
include 'parts/common/page-title-banner.php';
?>

                    <!--====== Start Map Section ======-->
                    <section class="xeno-contact-map">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-12">
                                    <!--=== Map Box ===-->
                                    <div class="map-box" data-aos="fade-up" data-aos-duration="1000">
                                        <iframe src="https://www.google.com/maps/embed?pb=!1m10!1m8!1m3!1d96777.16150026117!2d-74.00840582560909!3d40.71171357405996!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbd!4v1706508986625!5m2!1sen!2sbd" loading="lazy"></iframe>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section><!--====== End Map Section ======-->
                    <!--====== Start Contact Section ======-->
                    <section class="xeno-contact-sec pt-120 pb-100">
                        <div class="container">
                            <div class="row">
                                <div class="col-lg-5">
                                    <!-- Xeno Contact Box -->
                                    <div class="xeno-content-box mb-50" data-aos="fade-up" data-aos-duration="1000">
                                        <h2>Get In Touch</h2>
                                        <p>We’re here to help! Whether have a question, need more information our services</p>
                                        <ul>
                                            <li>
                                                <h5>Address</h5>
                                                <p>838 Broadway, New York, NY 10003, USA</p>
                                            </li>
                                            <li>
                                                <h5>Email</h5>
                                                <p><a href="mailto:example@gmail.com">mailto:example@gmail.com</a></p>
                                            </li>
                                            <li>
                                                <h3><a href="tel:+1(234)568-9023">+1 (234) 568-9023</a></h3>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div class="col-lg-7">
                                    <!-- Xeno Contact Wrapper -->
                                    <div class="xeno-contact-wrapper mb-50" data-aos="fade-up" data-aos-duration="1200">
                                        <h2 class="mb-20">Send Us Message</h2>
                                        <form class="xeno-contact-form" id="contact-form" action="mailer.php" method="POST">
                                            <div class="row">
                                                <div class="col-lg-6">
                                                    <div class="form-group">
                                                        <input type="text" class="form_control" placeholder="Name" name="name" required>
                                                    </div>
                                                </div>
                                                <div class="col-lg-6">
                                                    <div class="form-group">
                                                        <input type="email" class="form_control" placeholder="Email" name="email" required>
                                                    </div>
                                                </div>
                                                <div class="col-lg-6">
                                                    <div class="form-group">
                                                        <input type="text" class="form_control" placeholder="Phone" name="phone" required>
                                                    </div>
                                                </div>
                                                <div class="col-lg-6">
                                                    <div class="form-group">
                                                        <input type="text" class="form_control" placeholder="Subject" name="subject" required>
                                                    </div>
                                                </div>
                                                <div class="col-lg-12">
                                                    <div class="form-group">
                                                        <textarea class="form_control" placeholder="Message" name="message" rows="5" cols="8"></textarea>
                                                    </div>
                                                </div>
                                                <div class="col-lg-12">
                                                    <div class="form-group">
                                                        <button class="theme-btn style-one">Send Message Us <i class="far fa-angle-double-right"></i></button>
                                                    </div>
                                                </div>
                                                <div class="col-lg-12">
                                                    <div class="form-group">
                                                        <p class="form-message"></p>
                                                    </div>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section><!--====== End Contact Section ======-->
<?php
require_once 'layout/footers/xeno-footer-ca.php';