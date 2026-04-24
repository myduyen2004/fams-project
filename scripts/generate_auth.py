import re

xml_data = """<mxfile host="app.diagrams.net" agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36" version="29.6.6">
  <diagram name="Authentication Class Diagram" id="auth">
    <mxGraphModel dx="1442" dy="562" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="3000" pageHeight="4000" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="11" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#dae8fc;strokeColor=#6c8ebf;" value="&amp;lt;&amp;lt;RestController&amp;gt;&amp;gt;&#xa;AuthController" vertex="1">
          <mxGeometry height="346" width="460" x="750" y="20" as="geometry" />
        </mxCell>
        <mxCell id="12" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- authService : AuthService" vertex="1">
          <mxGeometry height="26" width="460" y="26" as="geometry" />
        </mxCell>
        <mxCell id="13" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userService : UserService" vertex="1">
          <mxGeometry height="26" width="460" y="52" as="geometry" />
        </mxCell>
        <mxCell id="14" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- systemLogService : SystemLogService" vertex="1">
          <mxGeometry height="26" width="460" y="78" as="geometry" />
        </mxCell>
        <mxCell id="15" parent="11" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="460" y="104" as="geometry" />
        </mxCell>
        <mxCell id="16" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ login(LoginRequest, HttpServletRequest) : ResponseEntity&amp;lt;LoginResponse&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="112" as="geometry" />
        </mxCell>
        <mxCell id="17" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ logout() : ResponseEntity&amp;lt;Void&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="138" as="geometry" />
        </mxCell>
        <mxCell id="18" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ changePassword(ChangePasswordRequest) : ResponseEntity&amp;lt;Void&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="164" as="geometry" />
        </mxCell>
        <mxCell id="19" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ forgotPassword(ForgotPasswordRequest) : ResponseEntity&amp;lt;Void&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="190" as="geometry" />
        </mxCell>
        <mxCell id="20" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ verifyOtp(VerifyOtpRequest) : ResponseEntity&amp;lt;Void&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="216" as="geometry" />
        </mxCell>
        <mxCell id="21" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ resetPassword(ResetPasswordRequest) : ResponseEntity&amp;lt;Void&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="242" as="geometry" />
        </mxCell>
        <mxCell id="22" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ updateProfile(UpdateProfileRequest, MultipartFile) : ResponseEntity&amp;lt;UserResponse&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="268" as="geometry" />
        </mxCell>
        <mxCell id="23" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ getCurrentUser() : ResponseEntity&amp;lt;UserResponse&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="294" as="geometry" />
        </mxCell>
        <mxCell id="24" parent="11" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ getPublicUserProfile(Long) : ResponseEntity&amp;lt;UserResponse&amp;gt;" vertex="1">
          <mxGeometry height="26" width="460" y="320" as="geometry" />
        </mxCell>
        <mxCell id="25" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;AuthService" vertex="1">
          <mxGeometry height="632" width="500" x="400" y="520" as="geometry" />
        </mxCell>
        <mxCell id="26" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userRepository : UserRepository" vertex="1">
          <mxGeometry height="26" width="500" y="26" as="geometry" />
        </mxCell>
        <mxCell id="27" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- passwordEncoder : PasswordEncoder" vertex="1">
          <mxGeometry height="26" width="500" y="52" as="geometry" />
        </mxCell>
        <mxCell id="28" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- jwtUtil : JwtUtil" vertex="1">
          <mxGeometry height="26" width="500" y="78" as="geometry" />
        </mxCell>
        <mxCell id="29" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userSessionRepository : UserSessionRepository" vertex="1">
          <mxGeometry height="26" width="500" y="104" as="geometry" />
        </mxCell>
        <mxCell id="30" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- accessLogRepository : AccessLogRepository" vertex="1">
          <mxGeometry height="26" width="500" y="130" as="geometry" />
        </mxCell>
        <mxCell id="31" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- geoLocationService : GeoLocationService" vertex="1">
          <mxGeometry height="26" width="500" y="156" as="geometry" />
        </mxCell>
        <mxCell id="32" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- emailService : EmailService" vertex="1">
          <mxGeometry height="26" width="500" y="182" as="geometry" />
        </mxCell>
        <mxCell id="33" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- redisTemplate : StringRedisTemplate" vertex="1">
          <mxGeometry height="26" width="500" y="208" as="geometry" />
        </mxCell>
        <mxCell id="34" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- systemLogService : SystemLogService" vertex="1">
          <mxGeometry height="26" width="500" y="234" as="geometry" />
        </mxCell>
        <mxCell id="35" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userPermissionRepository : UserPermissionRepository" vertex="1">
          <mxGeometry height="26" width="500" y="260" as="geometry" />
        </mxCell>
        <mxCell id="36" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- dashboardBroadcastService : DashboardBroadcastService" vertex="1">
          <mxGeometry height="26" width="500" y="286" as="geometry" />
        </mxCell>
        <mxCell id="37" parent="25" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="500" y="312" as="geometry" />
        </mxCell>
        <mxCell id="38" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ login(LoginRequest, HttpServletRequest) : LoginResponse" vertex="1">
          <mxGeometry height="26" width="500" y="320" as="geometry" />
        </mxCell>
        <mxCell id="39" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ performLogin(LoginRequest, ...) : LoginResponse" vertex="1">
          <mxGeometry height="26" width="500" y="346" as="geometry" />
        </mxCell>
        <mxCell id="40" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ logout() : void" vertex="1">
          <mxGeometry height="26" width="500" y="372" as="geometry" />
        </mxCell>
        <mxCell id="41" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ performLogout() : void" vertex="1">
          <mxGeometry height="26" width="500" y="398" as="geometry" />
        </mxCell>
        <mxCell id="42" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ loadUserByUsername(String) : UserDetails" vertex="1">
          <mxGeometry height="26" width="500" y="424" as="geometry" />
        </mxCell>
        <mxCell id="43" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ forgotPassword(ForgotPasswordRequest) : void" vertex="1">
          <mxGeometry height="26" width="500" y="450" as="geometry" />
        </mxCell>
        <mxCell id="44" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ verifyOtp(VerifyOtpRequest) : boolean" vertex="1">
          <mxGeometry height="26" width="500" y="476" as="geometry" />
        </mxCell>
        <mxCell id="45" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ resetPassword(ResetPasswordRequest) : void" vertex="1">
          <mxGeometry height="26" width="500" y="502" as="geometry" />
        </mxCell>
        <mxCell id="46" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- createUserSession(User, String, String, LocationData) : void" vertex="1">
          <mxGeometry height="26" width="500" y="528" as="geometry" />
        </mxCell>
        <mxCell id="47" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- createAccessLog(User, String, String, LocationData) : void" vertex="1">
          <mxGeometry height="26" width="500" y="554" as="geometry" />
        </mxCell>
        <mxCell id="48" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- trackLoginFailure(String) : void" vertex="1">
          <mxGeometry height="26" width="500" y="580" as="geometry" />
        </mxCell>
        <mxCell id="49" parent="25" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- resetLoginFailures(String) : void" vertex="1">
          <mxGeometry height="26" width="500" y="606" as="geometry" />
        </mxCell>
        <mxCell id="50" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;UserDetailsService" vertex="1">
          <mxGeometry height="60" width="340" x="20" y="520" as="geometry" />
        </mxCell>
        <mxCell id="51" parent="50" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="340" y="26" as="geometry" />
        </mxCell>
        <mxCell id="52" parent="50" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ loadUserByUsername(String) : UserDetails" vertex="1">
          <mxGeometry height="26" width="340" y="34" as="geometry" />
        </mxCell>
        <mxCell id="53" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;UserService" vertex="1">
          <mxGeometry height="138" width="380" x="1000" y="520" as="geometry" />
        </mxCell>
        <mxCell id="54" parent="53" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="380" y="26" as="geometry" />
        </mxCell>
        <mxCell id="55" parent="53" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ getUserById(Long) : UserResponse" vertex="1">
          <mxGeometry height="26" width="380" y="34" as="geometry" />
        </mxCell>
        <mxCell id="56" parent="53" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ getUserByUsername(String) : UserResponse" vertex="1">
          <mxGeometry height="26" width="380" y="60" as="geometry" />
        </mxCell>
        <mxCell id="57" parent="53" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ changePassword(String, String) : void" vertex="1">
          <mxGeometry height="26" width="380" y="86" as="geometry" />
        </mxCell>
        <mxCell id="58" parent="53" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ updateMyProfile(String, UpdateProfileRequest, MultipartFile) : UserResponse" vertex="1">
          <mxGeometry height="26" width="380" y="112" as="geometry" />
        </mxCell>
        <mxCell id="59" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;EmailService" vertex="1">
          <mxGeometry height="86" width="340" x="20" y="780" as="geometry" />
        </mxCell>
        <mxCell id="60" parent="59" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="340" y="26" as="geometry" />
        </mxCell>
        <mxCell id="61" parent="59" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ sendOtpEmail(String, String) : void" vertex="1">
          <mxGeometry height="26" width="340" y="34" as="geometry" />
        </mxCell>
        <mxCell id="62" parent="59" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ sendEmail(String, String, String) : void" vertex="1">
          <mxGeometry height="26" width="340" y="60" as="geometry" />
        </mxCell>
        <mxCell id="63" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;GeoLocationService" vertex="1">
          <mxGeometry height="164" width="340" x="20" y="920" as="geometry" />
        </mxCell>
        <mxCell id="64" parent="63" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- restTemplate : RestTemplate" vertex="1">
          <mxGeometry height="26" width="340" y="26" as="geometry" />
        </mxCell>
        <mxCell id="65" parent="63" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- objectMapper : ObjectMapper" vertex="1">
          <mxGeometry height="26" width="340" y="52" as="geometry" />
        </mxCell>
        <mxCell id="66" parent="63" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- {static} GEO_API_URL : String" vertex="1">
          <mxGeometry height="26" width="340" y="78" as="geometry" />
        </mxCell>
        <mxCell id="67" parent="63" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="340" y="104" as="geometry" />
        </mxCell>
        <mxCell id="68" parent="63" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ getLocationFromIP(String) : LocationData" vertex="1">
          <mxGeometry height="26" width="340" y="112" as="geometry" />
        </mxCell>
        <mxCell id="69" parent="63" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- isPrivateIP(String) : boolean" vertex="1">
          <mxGeometry height="26" width="340" y="138" as="geometry" />
        </mxCell>
        <mxCell id="70" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;inner class&amp;gt;&amp;gt;&#xa;LocationData" vertex="1">
          <mxGeometry height="138" width="280" x="-310" y="520" as="geometry" />
        </mxCell>
        <mxCell id="71" parent="70" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- province : String" vertex="1">
          <mxGeometry height="26" width="280" y="26" as="geometry" />
        </mxCell>
        <mxCell id="72" parent="70" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- city : String" vertex="1">
          <mxGeometry height="26" width="280" y="52" as="geometry" />
        </mxCell>
        <mxCell id="73" parent="70" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- latitude : BigDecimal" vertex="1">
          <mxGeometry height="26" width="280" y="78" as="geometry" />
        </mxCell>
        <mxCell id="74" parent="70" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- longitude : BigDecimal" vertex="1">
          <mxGeometry height="26" width="280" y="104" as="geometry" />
        </mxCell>
        <mxCell id="75" parent="70" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="280" y="130" as="geometry" />
        </mxCell>
        <mxCell id="76" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;SystemLogService" vertex="1">
          <mxGeometry height="138" width="380" x="1000" y="780" as="geometry" />
        </mxCell>
        <mxCell id="77" parent="76" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="380" y="26" as="geometry" />
        </mxCell>
        <mxCell id="78" parent="76" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ logLoginSuccess(String) : void" vertex="1">
          <mxGeometry height="26" width="380" y="34" as="geometry" />
        </mxCell>
        <mxCell id="79" parent="76" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ logLoginFailed(String) : void" vertex="1">
          <mxGeometry height="26" width="380" y="60" as="geometry" />
        </mxCell>
        <mxCell id="80" parent="76" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ logBruteForceWarning(String, int) : void" vertex="1">
          <mxGeometry height="26" width="380" y="86" as="geometry" />
        </mxCell>
        <mxCell id="81" parent="76" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ logPasswordChanged(String) : void" vertex="1">
          <mxGeometry height="26" width="380" y="112" as="geometry" />
        </mxCell>
        <mxCell id="82" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#d5e8d4;strokeColor=#82b366;" value="&amp;lt;&amp;lt;Service&amp;gt;&amp;gt;&#xa;DashboardBroadcastService" vertex="1">
          <mxGeometry height="60" width="380" x="1000" y="950" as="geometry" />
        </mxCell>
        <mxCell id="83" parent="82" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="380" y="26" as="geometry" />
        </mxCell>
        <mxCell id="84" parent="82" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ broadcastUpdate() : void" vertex="1">
          <mxGeometry height="26" width="380" y="34" as="geometry" />
        </mxCell>
        <mxCell id="85" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#ffe6cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;Configuration&amp;gt;&amp;gt;&#xa;SecurityConfig" vertex="1">
          <mxGeometry height="138" width="380" x="1500" y="520" as="geometry" />
        </mxCell>
        <mxCell id="86" parent="85" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- jwtAuthenticationFilter : JwtAuthenticationFilter" vertex="1">
          <mxGeometry height="26" width="380" y="26" as="geometry" />
        </mxCell>
        <mxCell id="87" parent="85" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- allowedOrigins : String" vertex="1">
          <mxGeometry height="26" width="380" y="52" as="geometry" />
        </mxCell>
        <mxCell id="88" parent="85" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="380" y="78" as="geometry" />
        </mxCell>
        <mxCell id="89" parent="85" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ securityFilterChain(HttpSecurity) : SecurityFilterChain" vertex="1">
          <mxGeometry height="26" width="380" y="86" as="geometry" />
        </mxCell>
        <mxCell id="90" parent="85" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ corsConfigurationSource() : CorsConfigurationSource" vertex="1">
          <mxGeometry height="26" width="380" y="112" as="geometry" />
        </mxCell>
        <mxCell id="91" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#ffe6cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;Component&amp;gt;&amp;gt;&#xa;JwtUtil" vertex="1">
          <mxGeometry height="216" width="380" x="1500" y="730" as="geometry" />
        </mxCell>
        <mxCell id="92" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- jwtSecret : String" vertex="1">
          <mxGeometry height="26" width="380" y="26" as="geometry" />
        </mxCell>
        <mxCell id="93" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- jwtExpiration : long" vertex="1">
          <mxGeometry height="26" width="380" y="52" as="geometry" />
        </mxCell>
        <mxCell id="94" parent="91" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="380" y="78" as="geometry" />
        </mxCell>
        <mxCell id="95" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ generateToken(Authentication) : String" vertex="1">
          <mxGeometry height="26" width="380" y="86" as="geometry" />
        </mxCell>
        <mxCell id="96" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ generateToken(String) : String" vertex="1">
          <mxGeometry height="26" width="380" y="112" as="geometry" />
        </mxCell>
        <mxCell id="97" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ getUsernameFromToken(String) : String" vertex="1">
          <mxGeometry height="26" width="380" y="138" as="geometry" />
        </mxCell>
        <mxCell id="98" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ validateToken(String) : boolean" vertex="1">
          <mxGeometry height="26" width="380" y="164" as="geometry" />
        </mxCell>
        <mxCell id="99" parent="91" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- getSigningKey() : SecretKey" vertex="1">
          <mxGeometry height="26" width="380" y="190" as="geometry" />
        </mxCell>
        <mxCell id="100" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#ffe6cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;Component&amp;gt;&amp;gt;&#xa;JwtAuthenticationFilter" vertex="1">
          <mxGeometry height="138" width="380" x="1500" y="1020" as="geometry" />
        </mxCell>
        <mxCell id="101" parent="100" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- jwtUtil : JwtUtil" vertex="1">
          <mxGeometry height="26" width="380" y="26" as="geometry" />
        </mxCell>
        <mxCell id="102" parent="100" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userDetailsService : UserDetailsService" vertex="1">
          <mxGeometry height="26" width="380" y="52" as="geometry" />
        </mxCell>
        <mxCell id="103" parent="100" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="380" y="78" as="geometry" />
        </mxCell>
        <mxCell id="104" parent="100" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="# doFilterInternal(HttpServletRequest, HttpServletResponse, FilterChain) : void" vertex="1">
          <mxGeometry height="26" width="380" y="86" as="geometry" />
        </mxCell>
        <mxCell id="105" parent="100" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- parseJwt(HttpServletRequest) : String" vertex="1">
          <mxGeometry height="26" width="380" y="112" as="geometry" />
        </mxCell>
        <mxCell id="106" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#ffe6cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;abstract&amp;gt;&amp;gt;&#xa;OncePerRequestFilter" vertex="1">
          <mxGeometry height="60" width="330" x="1940" y="1020" as="geometry" />
        </mxCell>
        <mxCell id="107" parent="106" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="330" y="26" as="geometry" />
        </mxCell>
        <mxCell id="108" parent="106" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ {abstract} doFilterInternal(...) : void" vertex="1">
          <mxGeometry height="26" width="330" y="34" as="geometry" />
        </mxCell>
        <mxCell id="109" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#e1d5e7;strokeColor=#9673a6;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;LoginRequest" vertex="1">
          <mxGeometry height="86" width="260" x="100" y="1420" as="geometry" />
        </mxCell>
        <mxCell id="110" parent="109" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- username : String" vertex="1">
          <mxGeometry height="26" width="260" y="26" as="geometry" />
        </mxCell>
        <mxCell id="111" parent="109" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- password : String" vertex="1">
          <mxGeometry height="26" width="260" y="52" as="geometry" />
        </mxCell>
        <mxCell id="112" parent="109" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="260" y="78" as="geometry" />
        </mxCell>
        <mxCell id="113" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#e1d5e7;strokeColor=#9673a6;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;ChangePasswordRequest" vertex="1">
          <mxGeometry height="60" width="260" x="380" y="1420" as="geometry" />
        </mxCell>
        <mxCell id="114" parent="113" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- newPassword : String" vertex="1">
          <mxGeometry height="26" width="260" y="26" as="geometry" />
        </mxCell>
        <mxCell id="115" parent="113" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="260" y="52" as="geometry" />
        </mxCell>
        <mxCell id="116" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#e1d5e7;strokeColor=#9673a6;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;ForgotPasswordRequest" vertex="1">
          <mxGeometry height="60" width="260" x="660" y="1420" as="geometry" />
        </mxCell>
        <mxCell id="117" parent="116" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- email : String" vertex="1">
          <mxGeometry height="26" width="260" y="26" as="geometry" />
        </mxCell>
        <mxCell id="118" parent="116" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="260" y="52" as="geometry" />
        </mxCell>
        <mxCell id="119" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#e1d5e7;strokeColor=#9673a6;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;VerifyOtpRequest" vertex="1">
          <mxGeometry height="86" width="260" x="940" y="1420" as="geometry" />
        </mxCell>
        <mxCell id="120" parent="119" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- email : String" vertex="1">
          <mxGeometry height="26" width="260" y="26" as="geometry" />
        </mxCell>
        <mxCell id="121" parent="119" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- otp : String" vertex="1">
          <mxGeometry height="26" width="260" y="52" as="geometry" />
        </mxCell>
        <mxCell id="122" parent="119" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="260" y="78" as="geometry" />
        </mxCell>
        <mxCell id="123" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#e1d5e7;strokeColor=#9673a6;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;ResetPasswordRequest" vertex="1">
          <mxGeometry height="112" width="260" x="1220" y="1420" as="geometry" />
        </mxCell>
        <mxCell id="124" parent="123" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- email : String" vertex="1">
          <mxGeometry height="26" width="260" y="26" as="geometry" />
        </mxCell>
        <mxCell id="125" parent="123" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- otp : String" vertex="1">
          <mxGeometry height="26" width="260" y="52" as="geometry" />
        </mxCell>
        <mxCell id="126" parent="123" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- newPassword : String" vertex="1">
          <mxGeometry height="26" width="260" y="78" as="geometry" />
        </mxCell>
        <mxCell id="127" parent="123" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="260" y="104" as="geometry" />
        </mxCell>
        <mxCell id="128" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#e1d5e7;strokeColor=#9673a6;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;UpdateProfileRequest" vertex="1">
          <mxGeometry height="86" width="260" x="1500" y="1420" as="geometry" />
        </mxCell>
        <mxCell id="129" parent="128" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- phone : String" vertex="1">
          <mxGeometry height="26" width="260" y="26" as="geometry" />
        </mxCell>
        <mxCell id="130" parent="128" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- dob : LocalDate" vertex="1">
          <mxGeometry height="26" width="260" y="52" as="geometry" />
        </mxCell>
        <mxCell id="131" parent="128" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="260" y="78" as="geometry" />
        </mxCell>
        <mxCell id="132" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;LoginResponse" vertex="1">
          <mxGeometry height="138" width="300" x="100" y="1620" as="geometry" />
        </mxCell>
        <mxCell id="133" parent="132" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- token : String" vertex="1">
          <mxGeometry height="26" width="300" y="26" as="geometry" />
        </mxCell>
        <mxCell id="134" parent="132" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- type : String" vertex="1">
          <mxGeometry height="26" width="300" y="52" as="geometry" />
        </mxCell>
        <mxCell id="135" parent="132" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- user : UserInfo" vertex="1">
          <mxGeometry height="26" width="300" y="78" as="geometry" />
        </mxCell>
        <mxCell id="136" parent="132" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="300" y="104" as="geometry" />
        </mxCell>
        <mxCell id="137" parent="132" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ {static} fromUser(User) : UserInfo" vertex="1">
          <mxGeometry height="26" width="300" y="112" as="geometry" />
        </mxCell>
        <mxCell id="138" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;static inner&amp;gt;&amp;gt;&#xa;UserInfo" vertex="1">
          <mxGeometry height="294" width="300" x="420" y="1620" as="geometry" />
        </mxCell>
        <mxCell id="139" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- id : Long" vertex="1">
          <mxGeometry height="26" width="300" y="26" as="geometry" />
        </mxCell>
        <mxCell id="140" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- username : String" vertex="1">
          <mxGeometry height="26" width="300" y="52" as="geometry" />
        </mxCell>
        <mxCell id="141" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- fullName : String" vertex="1">
          <mxGeometry height="26" width="300" y="78" as="geometry" />
        </mxCell>
        <mxCell id="142" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- email : String" vertex="1">
          <mxGeometry height="26" width="300" y="104" as="geometry" />
        </mxCell>
        <mxCell id="143" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- role : String" vertex="1">
          <mxGeometry height="26" width="300" y="130" as="geometry" />
        </mxCell>
        <mxCell id="144" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- avatar : String" vertex="1">
          <mxGeometry height="26" width="300" y="156" as="geometry" />
        </mxCell>
        <mxCell id="145" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- isPasswordChanged : Boolean" vertex="1">
          <mxGeometry height="26" width="300" y="182" as="geometry" />
        </mxCell>
        <mxCell id="146" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- phone : String" vertex="1">
          <mxGeometry height="26" width="300" y="208" as="geometry" />
        </mxCell>
        <mxCell id="147" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- dob : LocalDate" vertex="1">
          <mxGeometry height="26" width="300" y="234" as="geometry" />
        </mxCell>
        <mxCell id="148" parent="138" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- faceDataStatus : String" vertex="1">
          <mxGeometry height="26" width="300" y="260" as="geometry" />
        </mxCell>
        <mxCell id="149" parent="138" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="300" y="286" as="geometry" />
        </mxCell>
        <mxCell id="150" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#fff2cc;strokeColor=#d6b656;" value="&amp;lt;&amp;lt;DTO&amp;gt;&amp;gt;&#xa;UserResponse" vertex="1">
          <mxGeometry height="216" width="300" x="750" y="1620" as="geometry" />
        </mxCell>
        <mxCell id="151" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- id : Long" vertex="1">
          <mxGeometry height="26" width="300" y="26" as="geometry" />
        </mxCell>
        <mxCell id="152" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- username : String" vertex="1">
          <mxGeometry height="26" width="300" y="52" as="geometry" />
        </mxCell>
        <mxCell id="153" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- fullName : String" vertex="1">
          <mxGeometry height="26" width="300" y="78" as="geometry" />
        </mxCell>
        <mxCell id="154" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- email : String" vertex="1">
          <mxGeometry height="26" width="300" y="104" as="geometry" />
        </mxCell>
        <mxCell id="155" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- role : String" vertex="1">
          <mxGeometry height="26" width="300" y="130" as="geometry" />
        </mxCell>
        <mxCell id="156" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- status : String" vertex="1">
          <mxGeometry height="26" width="300" y="156" as="geometry" />
        </mxCell>
        <mxCell id="157" parent="150" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- avatar : String" vertex="1">
          <mxGeometry height="26" width="300" y="182" as="geometry" />
        </mxCell>
        <mxCell id="158" parent="150" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="300" y="208" as="geometry" />
        </mxCell>
        <mxCell id="159" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#f8cecc;strokeColor=#b85450;" value="&amp;lt;&amp;lt;Entity&amp;gt;&amp;gt;&#xa;User" vertex="1">
          <mxGeometry height="346" width="320" x="950" y="1900" as="geometry" />
        </mxCell>
        <mxCell id="160" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- id : Long" vertex="1">
          <mxGeometry height="26" width="320" y="26" as="geometry" />
        </mxCell>
        <mxCell id="161" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- username : String" vertex="1">
          <mxGeometry height="26" width="320" y="52" as="geometry" />
        </mxCell>
        <mxCell id="162" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- password : String" vertex="1">
          <mxGeometry height="26" width="320" y="78" as="geometry" />
        </mxCell>
        <mxCell id="163" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- fullName : String" vertex="1">
          <mxGeometry height="26" width="320" y="104" as="geometry" />
        </mxCell>
        <mxCell id="164" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- email : String" vertex="1">
          <mxGeometry height="26" width="320" y="130" as="geometry" />
        </mxCell>
        <mxCell id="165" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- phone : String" vertex="1">
          <mxGeometry height="26" width="320" y="156" as="geometry" />
        </mxCell>
        <mxCell id="166" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- dob : LocalDate" vertex="1">
          <mxGeometry height="26" width="320" y="182" as="geometry" />
        </mxCell>
        <mxCell id="167" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- avatar : String" vertex="1">
          <mxGeometry height="26" width="320" y="208" as="geometry" />
        </mxCell>
        <mxCell id="168" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- code : String" vertex="1">
          <mxGeometry height="26" width="320" y="234" as="geometry" />
        </mxCell>
        <mxCell id="169" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- role : UserRole" vertex="1">
          <mxGeometry height="26" width="320" y="260" as="geometry" />
        </mxCell>
        <mxCell id="170" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- status : UserStatus" vertex="1">
          <mxGeometry height="26" width="320" y="286" as="geometry" />
        </mxCell>
        <mxCell id="171" parent="159" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- isPasswordChanged : Boolean" vertex="1">
          <mxGeometry height="26" width="320" y="312" as="geometry" />
        </mxCell>
        <mxCell id="172" parent="159" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="320" y="338" as="geometry" />
        </mxCell>
        <mxCell id="173" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#f8cecc;strokeColor=#b85450;" value="&amp;lt;&amp;lt;Entity&amp;gt;&amp;gt;&#xa;UserSession" vertex="1">
          <mxGeometry height="320" width="340" x="550" y="1900" as="geometry" />
        </mxCell>
        <mxCell id="174" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- id : Long" vertex="1">
          <mxGeometry height="26" width="340" y="26" as="geometry" />
        </mxCell>
        <mxCell id="175" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- user : User" vertex="1">
          <mxGeometry height="26" width="340" y="52" as="geometry" />
        </mxCell>
        <mxCell id="176" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- ipAddress : String" vertex="1">
          <mxGeometry height="26" width="340" y="78" as="geometry" />
        </mxCell>
        <mxCell id="177" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- province : String" vertex="1">
          <mxGeometry height="26" width="340" y="104" as="geometry" />
        </mxCell>
        <mxCell id="178" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- city : String" vertex="1">
          <mxGeometry height="26" width="340" y="130" as="geometry" />
        </mxCell>
        <mxCell id="179" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- latitude : BigDecimal" vertex="1">
          <mxGeometry height="26" width="340" y="156" as="geometry" />
        </mxCell>
        <mxCell id="180" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- longitude : BigDecimal" vertex="1">
          <mxGeometry height="26" width="340" y="182" as="geometry" />
        </mxCell>
        <mxCell id="181" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- loginTime : LocalDateTime" vertex="1">
          <mxGeometry height="26" width="340" y="208" as="geometry" />
        </mxCell>
        <mxCell id="182" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- lastActivityTime : LocalDateTime" vertex="1">
          <mxGeometry height="26" width="340" y="234" as="geometry" />
        </mxCell>
        <mxCell id="183" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- isActive : Boolean" vertex="1">
          <mxGeometry height="26" width="340" y="260" as="geometry" />
        </mxCell>
        <mxCell id="184" parent="173" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userAgent : String" vertex="1">
          <mxGeometry height="26" width="340" y="286" as="geometry" />
        </mxCell>
        <mxCell id="185" parent="173" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="340" y="312" as="geometry" />
        </mxCell>
        <mxCell id="186" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#f8cecc;strokeColor=#b85450;" value="&amp;lt;&amp;lt;Entity&amp;gt;&amp;gt;&#xa;AccessLog" vertex="1">
          <mxGeometry height="216" width="320" x="1300" y="1900" as="geometry" />
        </mxCell>
        <mxCell id="187" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- id : Long" vertex="1">
          <mxGeometry height="26" width="320" y="26" as="geometry" />
        </mxCell>
        <mxCell id="188" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- user : User" vertex="1">
          <mxGeometry height="26" width="320" y="52" as="geometry" />
        </mxCell>
        <mxCell id="189" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- location : String" vertex="1">
          <mxGeometry height="26" width="320" y="78" as="geometry" />
        </mxCell>
        <mxCell id="190" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- status : String" vertex="1">
          <mxGeometry height="26" width="320" y="104" as="geometry" />
        </mxCell>
        <mxCell id="191" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- accessTime : LocalDateTime" vertex="1">
          <mxGeometry height="26" width="320" y="130" as="geometry" />
        </mxCell>
        <mxCell id="192" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- ipAddress : String" vertex="1">
          <mxGeometry height="26" width="320" y="156" as="geometry" />
        </mxCell>
        <mxCell id="193" parent="186" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- userAgent : String" vertex="1">
          <mxGeometry height="26" width="320" y="182" as="geometry" />
        </mxCell>
        <mxCell id="194" parent="186" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="320" y="208" as="geometry" />
        </mxCell>
        <mxCell id="195" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d0e8f2;strokeColor=#5b9bd5;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;UserRepository" vertex="1">
          <mxGeometry height="112" width="360" x="550" y="2280" as="geometry" />
        </mxCell>
        <mxCell id="196" parent="195" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="360" y="26" as="geometry" />
        </mxCell>
        <mxCell id="197" parent="195" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ findByUsername(String) : Optional&amp;lt;User&amp;gt;" vertex="1">
          <mxGeometry height="26" width="360" y="34" as="geometry" />
        </mxCell>
        <mxCell id="198" parent="195" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ findByUsernameWithProfiles(String) : Optional&amp;lt;User&amp;gt;" vertex="1">
          <mxGeometry height="26" width="360" y="60" as="geometry" />
        </mxCell>
        <mxCell id="199" parent="195" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ findByEmail(String) : Optional&amp;lt;User&amp;gt;" vertex="1">
          <mxGeometry height="26" width="360" y="86" as="geometry" />
        </mxCell>
        <mxCell id="200" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d0e8f2;strokeColor=#5b9bd5;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;UserSessionRepository" vertex="1">
          <mxGeometry height="86" width="360" x="950" y="2280" as="geometry" />
        </mxCell>
        <mxCell id="201" parent="200" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="360" y="26" as="geometry" />
        </mxCell>
        <mxCell id="202" parent="200" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ findActiveSessionsByUserId(Long) : List&amp;lt;UserSession&amp;gt;" vertex="1">
          <mxGeometry height="26" width="360" y="34" as="geometry" />
        </mxCell>
        <mxCell id="203" parent="200" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ save(UserSession) : UserSession" vertex="1">
          <mxGeometry height="26" width="360" y="60" as="geometry" />
        </mxCell>
        <mxCell id="204" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d0e8f2;strokeColor=#5b9bd5;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;AccessLogRepository" vertex="1">
          <mxGeometry height="86" width="360" x="1350" y="2280" as="geometry" />
        </mxCell>
        <mxCell id="205" parent="204" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="360" y="26" as="geometry" />
        </mxCell>
        <mxCell id="206" parent="204" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ findTopByUserIdOrderByAccessTimeDesc(Long) : Optional&amp;lt;AccessLog&amp;gt;" vertex="1">
          <mxGeometry height="26" width="360" y="34" as="geometry" />
        </mxCell>
        <mxCell id="207" parent="204" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ save(AccessLog) : AccessLog" vertex="1">
          <mxGeometry height="26" width="360" y="60" as="geometry" />
        </mxCell>
        <mxCell id="208" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#d0e8f2;strokeColor=#5b9bd5;" value="&amp;lt;&amp;lt;interface&amp;gt;&amp;gt;&#xa;UserPermissionRepository" vertex="1">
          <mxGeometry height="60" width="360" x="150" y="2280" as="geometry" />
        </mxCell>
        <mxCell id="209" parent="208" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="360" y="26" as="geometry" />
        </mxCell>
        <mxCell id="210" parent="208" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ findPermissionsByUserId(Long) : List&amp;lt;Permission&amp;gt;" vertex="1">
          <mxGeometry height="26" width="360" y="34" as="geometry" />
        </mxCell>
        <mxCell id="211" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#fce5cd;strokeColor=#d79b00;" value="&amp;lt;&amp;lt;Exception&amp;gt;&amp;gt;&#xa;UnauthorizedException" vertex="1">
          <mxGeometry height="86" width="280" x="1750" y="1620" as="geometry" />
        </mxCell>
        <mxCell id="212" parent="211" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- message : String" vertex="1">
          <mxGeometry height="26" width="280" y="26" as="geometry" />
        </mxCell>
        <mxCell id="213" parent="211" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="280" y="52" as="geometry" />
        </mxCell>
        <mxCell id="214" parent="211" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ UnauthorizedException(String)" vertex="1">
          <mxGeometry height="26" width="280" y="60" as="geometry" />
        </mxCell>
        <mxCell id="215" parent="1" style="swimlane;fontStyle=1;align=center;startSize=26;html=1;collapsible=0;fillColor=#fce5cd;strokeColor=#d79b00;" value="&amp;lt;&amp;lt;Exception&amp;gt;&amp;gt;&#xa;BadRequestException" vertex="1">
          <mxGeometry height="86" width="280" x="1750" y="1780" as="geometry" />
        </mxCell>
        <mxCell id="216" parent="215" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="- message : String" vertex="1">
          <mxGeometry height="26" width="280" y="26" as="geometry" />
        </mxCell>
        <mxCell id="217" parent="215" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="280" y="52" as="geometry" />
        </mxCell>
        <mxCell id="218" parent="215" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;html=1;fontSize=11;" value="+ BadRequestException(String)" vertex="1">
          <mxGeometry height="26" width="280" y="60" as="geometry" />
        </mxCell>
        <mxCell id="219" parent="1" style="swimlane;fontStyle=3;align=center;startSize=26;html=1;collapsible=0;fillColor=#fce5cd;strokeColor=#d79b00;" value="&amp;lt;&amp;lt;abstract&amp;gt;&amp;gt;&#xa;RuntimeException" vertex="1">
          <mxGeometry height="34" width="230" x="1800" y="1950" as="geometry" />
        </mxCell>
        <mxCell id="220" parent="219" style="line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=10;rotatable=0;labelPosition=left;points=[];portConstraint=eastwest;strokeColor=inherit;html=1;" value="" vertex="1">
          <mxGeometry height="8" width="230" y="26" as="geometry" />
        </mxCell>
        <mxCell id="221" edge="1" parent="1" source="11" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="25" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="222" edge="1" parent="1" source="11" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="53" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="223" edge="1" parent="1" source="11" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="76" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="224" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=0;dashed=1;strokeColor=#333333;fontSize=10;" target="50" value="implements">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="225" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="91" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="226" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="63" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="227" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="59" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="228" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="76" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="229" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="82" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="230" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="195" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="231" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="200" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="232" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="204" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="233" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="208" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="234" edge="1" parent="1" source="100" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=0;strokeColor=#333333;fontSize=10;" target="106" value="extends">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="235" edge="1" parent="1" source="100" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="91" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="236" edge="1" parent="1" source="100" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="50" value="uses">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="237" edge="1" parent="1" source="85" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="100" value="configures">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="238" edge="1" parent="1" source="63" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=diamond;endFill=1;strokeColor=#333333;fontSize=10;" target="70" value="contains">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="239" edge="1" parent="1" source="132" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=diamond;endFill=1;strokeColor=#333333;fontSize=10;" target="138" value="contains">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="240" edge="1" parent="1" source="11" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="109" value="receives">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="241" edge="1" parent="1" source="11" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="132" value="returns">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="242" edge="1" parent="1" source="11" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="150" value="returns">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="243" edge="1" parent="1" source="173" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="159" value="*..1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="244" edge="1" parent="1" source="186" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;strokeColor=#333333;fontSize=10;" target="159" value="*..1">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="245" edge="1" parent="1" source="195" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="159" value="manages">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="246" edge="1" parent="1" source="200" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="173" value="manages">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="247" edge="1" parent="1" source="204" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="186" value="manages">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="248" edge="1" parent="1" source="211" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=0;strokeColor=#333333;fontSize=10;" target="219" value="extends">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="249" edge="1" parent="1" source="215" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=0;strokeColor=#333333;fontSize=10;" target="219" value="extends">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="250" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="211" value="throws">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="251" edge="1" parent="1" source="25" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="215" value="throws">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="252" edge="1" parent="1" source="132" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=open;endFill=0;dashed=1;strokeColor=#999999;fontSize=10;" target="159" value="converts from">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
"""

# Now write it
xml_data = re.sub(r'fillColor=#[0-9a-fA-F]{6};?', 'fillColor=#ffffff;', xml_data)
xml_data = re.sub(r'strokeColor=#[0-9a-fA-F]{6};?', 'strokeColor=#000000;', xml_data)

out_path = r'd:\fams-project\docs\authentication_class_diagram.drawio'
with open(out_path, 'w', encoding='utf-8') as out:
    out.write(xml_data)

print(f"Successfully generated authentic class diagram")
