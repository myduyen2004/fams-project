package com.fams.backend.controller;

import com.fams.backend.entity.Room;
import com.fams.backend.entity.RoomWiFiAccessPoint;
import com.fams.backend.entity.WiFiAccessPoint;
import com.fams.backend.exception.BadRequestException;
import com.fams.backend.repository.RoomRepository;
import com.fams.backend.repository.RoomWiFiAccessPointRepository;
import com.fams.backend.repository.WiFiAccessPointRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WiFiAccessPointControllerTest {

    @Mock
    private WiFiAccessPointRepository wifiApRepository;

    @Mock
    private RoomWiFiAccessPointRepository roomWifiRepository;

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private WiFiAccessPointController controller;

    // =========================================================================
    // 1. Create Access Point Tests (5 Cases)
    // =========================================================================

    @Test
    void testCreateAccessPoint_DuplicateBssid() {
        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("00:11:22:33:44:55").build();
        when(wifiApRepository.existsByBssid("00:11:22:33:44:55")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () -> controller.createAccessPoint(req));
        assertEquals("Địa chỉ MAC (BSSID) này đã tồn tại trong hệ thống", ex.getMessage());
        verify(wifiApRepository, never()).save(any());
    }

    @Test
    void testCreateAccessPoint_Success() {
        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .ssid("FPT-WIFI").bssid("00:11:22").name("AP1").location("Hall").build();
        when(wifiApRepository.existsByBssid("00:11:22")).thenReturn(false);

        WiFiAccessPoint savedAp = WiFiAccessPoint.builder()
                .id(1L).ssid("FPT-WIFI").bssid("00:11:22")
                .status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        when(wifiApRepository.save(any(WiFiAccessPoint.class))).thenReturn(savedAp);

        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.createAccessPoint(req);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("00:11:22", result.getBody().getBssid());
    }

    @Test
    void testCreateAccessPoint_SaveReturnsDtoWithRoomCountZero() {
        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("00:22").build();
        when(wifiApRepository.existsByBssid(anyString())).thenReturn(false);
        WiFiAccessPoint savedAp = WiFiAccessPoint.builder().id(1L).bssid("00:22")
                .status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        when(wifiApRepository.save(any())).thenReturn(savedAp);

        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.createAccessPoint(req);
        assertEquals(0, result.getBody().getRoomCount());
    }

    @Test
    void testCreateAccessPoint_MissingFields_SavedProperly() {
        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder().build();
        when(wifiApRepository.existsByBssid(any())).thenReturn(false);
        WiFiAccessPoint savedAp = WiFiAccessPoint.builder()
                .id(2L).status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        when(wifiApRepository.save(any())).thenReturn(savedAp);

        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.createAccessPoint(req);
        assertEquals(2L, result.getBody().getId());
    }

    @Test
    void testCreateAccessPoint_DatabaseException() {
        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("aa:bb").build();
        when(wifiApRepository.existsByBssid("aa:bb")).thenReturn(false);
        when(wifiApRepository.save(any())).thenThrow(new RuntimeException("DB Error"));

        assertThrows(RuntimeException.class, () -> controller.createAccessPoint(req));
    }

    // =========================================================================
    // 2. Update Access Point Tests (5 Cases)
    // =========================================================================

    @Test
    void testUpdateAccessPoint_NotFound() {
        WiFiAccessPointController.CreateWiFiApRequest req = new WiFiAccessPointController.CreateWiFiApRequest();
        when(wifiApRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.updateAccessPoint(99L, req);
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void testUpdateAccessPoint_BssidChangedToExisting() {
        WiFiAccessPoint existingAp = WiFiAccessPoint.builder().id(1L).bssid("old-mac").build();
        when(wifiApRepository.findById(1L)).thenReturn(Optional.of(existingAp));
        when(wifiApRepository.existsByBssid("new-mac")).thenReturn(true);

        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("new-mac").build();

        BadRequestException ex = assertThrows(BadRequestException.class, () -> controller.updateAccessPoint(1L, req));
        assertEquals("Địa chỉ MAC (BSSID) này đã tồn tại trong hệ thống", ex.getMessage());
    }

    @Test
    void testUpdateAccessPoint_BssidUnchanged() {
        WiFiAccessPoint existingAp = WiFiAccessPoint.builder().id(1L).bssid("same-mac").status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        when(wifiApRepository.findById(1L)).thenReturn(Optional.of(existingAp));
        when(wifiApRepository.save(any())).thenReturn(existingAp);

        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("same-mac").name("New Name").build();

        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.updateAccessPoint(1L, req);
        assertEquals(HttpStatus.OK, result.getStatusCode());
        verify(wifiApRepository, never()).existsByBssid(anyString());
    }

    @Test
    void testUpdateAccessPoint_BssidChangedToValid() {
        WiFiAccessPoint existingAp = WiFiAccessPoint.builder().id(1L).bssid("old-mac").status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        when(wifiApRepository.findById(1L)).thenReturn(Optional.of(existingAp));
        when(wifiApRepository.existsByBssid("new-valid-mac")).thenReturn(false);
        when(wifiApRepository.save(any())).thenReturn(existingAp);

        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("new-valid-mac").build();

        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.updateAccessPoint(1L, req);
        assertEquals(HttpStatus.OK, result.getStatusCode());
    }

    @Test
    void testUpdateAccessPoint_MapsProperly() {
        WiFiAccessPoint existingAp = WiFiAccessPoint.builder().id(2L).bssid("mac1").status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        when(wifiApRepository.findById(2L)).thenReturn(Optional.of(existingAp));
        when(wifiApRepository.save(any())).thenReturn(existingAp);

        WiFiAccessPointController.CreateWiFiApRequest req = WiFiAccessPointController.CreateWiFiApRequest.builder()
                .bssid("mac1").name("Floor2").build();
        ResponseEntity<WiFiAccessPointController.WiFiApDTO> result = controller.updateAccessPoint(2L, req);
        assertEquals("Floor2", result.getBody().getName());
    }

    // =========================================================================
    // 3. Delete Access Point Tests (5 Cases)
    // =========================================================================

    @Test
    void testDeleteAccessPoint_Success() {
        when(wifiApRepository.existsById(1L)).thenReturn(true);
        ResponseEntity<Void> result = controller.deleteAccessPoint(1L);
        assertEquals(HttpStatus.NO_CONTENT, result.getStatusCode());
        verify(wifiApRepository).deleteById(1L);
    }

    @Test
    void testDeleteAccessPoint_NotFound() {
        when(wifiApRepository.existsById(2L)).thenReturn(false);
        ResponseEntity<Void> result = controller.deleteAccessPoint(2L);
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verify(wifiApRepository, never()).deleteById(anyLong());
    }

    @Test
    void testDeleteAccessPoint_NullId() {
        when(wifiApRepository.existsById(null)).thenReturn(false);
        ResponseEntity<Void> result = controller.deleteAccessPoint(null);
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void testDeleteAccessPoint_ExceptionOnExistsCheck() {
        when(wifiApRepository.existsById(1L)).thenThrow(new RuntimeException("DB Error"));
        assertThrows(RuntimeException.class, () -> controller.deleteAccessPoint(1L));
    }

    @Test
    void testDeleteAccessPoint_ExceptionOnDelete() {
        when(wifiApRepository.existsById(1L)).thenReturn(true);
        doThrow(new RuntimeException("Delete Error")).when(wifiApRepository).deleteById(1L);
        assertThrows(RuntimeException.class, () -> controller.deleteAccessPoint(1L));
    }

    // =========================================================================
    // 4. Assign Access Point to Room Tests (5 Cases)
    // =========================================================================

    @Test
    void testAssignToRoom_Success_PrimaryFalse() {
        WiFiAccessPoint ap = WiFiAccessPoint.builder().id(10L).status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        Room room = new Room(); room.setId(20L);

        when(wifiApRepository.findById(10L)).thenReturn(Optional.of(ap));
        when(roomRepository.findById(20L)).thenReturn(Optional.of(room));

        RoomWiFiAccessPoint assignment = RoomWiFiAccessPoint.builder()
                .id(30L).room(room).wifiAccessPoint(ap).isPrimary(false).build();
        when(roomWifiRepository.save(any())).thenReturn(assignment);

        WiFiAccessPointController.AssignApToRoomRequest req = new WiFiAccessPointController.AssignApToRoomRequest(10L, 80, false, "Corner");
        ResponseEntity<WiFiAccessPointController.RoomWiFiApDTO> result = controller.assignToRoom(20L, req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(30L, result.getBody().getId());
        verify(roomWifiRepository, never()).findByRoomId(20L); // Because isPrimary is false
    }

    @Test
    void testAssignToRoom_ApNotFound() {
        when(wifiApRepository.findById(10L)).thenReturn(Optional.empty());
        WiFiAccessPointController.AssignApToRoomRequest req = new WiFiAccessPointController.AssignApToRoomRequest(10L, 80, false, "Note");
        
        RuntimeException ex = assertThrows(RuntimeException.class, () -> controller.assignToRoom(20L, req));
        assertEquals("Access Point not found", ex.getMessage());
    }

    @Test
    void testAssignToRoom_RoomNotFound() {
        WiFiAccessPoint ap = WiFiAccessPoint.builder().id(10L).build();
        when(wifiApRepository.findById(10L)).thenReturn(Optional.of(ap));
        when(roomRepository.findById(20L)).thenReturn(Optional.empty());

        WiFiAccessPointController.AssignApToRoomRequest req = new WiFiAccessPointController.AssignApToRoomRequest(10L, 80, false, "Note");

        RuntimeException ex = assertThrows(RuntimeException.class, () -> controller.assignToRoom(20L, req));
        assertEquals("Room not found", ex.getMessage());
    }

    @Test
    void testAssignToRoom_Success_PrimaryTrue_UnsetsOthers() {
        WiFiAccessPoint ap = WiFiAccessPoint.builder().id(10L).status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        Room room = new Room(); room.setId(20L);

        when(wifiApRepository.findById(10L)).thenReturn(Optional.of(ap));
        when(roomRepository.findById(20L)).thenReturn(Optional.of(room));

        RoomWiFiAccessPoint existingPrimary = RoomWiFiAccessPoint.builder().id(99L).isPrimary(true).build();
        when(roomWifiRepository.findByRoomId(20L)).thenReturn(List.of(existingPrimary));

        RoomWiFiAccessPoint assignment = RoomWiFiAccessPoint.builder()
                .id(30L).room(room).wifiAccessPoint(ap).isPrimary(true).build();
        when(roomWifiRepository.save(any(RoomWiFiAccessPoint.class))).thenReturn(assignment);

        WiFiAccessPointController.AssignApToRoomRequest req = new WiFiAccessPointController.AssignApToRoomRequest(10L, 90, true, "Center");
        ResponseEntity<WiFiAccessPointController.RoomWiFiApDTO> result = controller.assignToRoom(20L, req);

        // Verification that it fetched old primaries and unset them
        verify(roomWifiRepository).findByRoomId(20L);
        assertFalse(existingPrimary.getIsPrimary()); 
        assertEquals(30L, result.getBody().getId());
    }

    @Test
    void testAssignToRoom_PrimaryNull_DefaultsToFalse() {
        WiFiAccessPoint ap = WiFiAccessPoint.builder().id(10L).status(WiFiAccessPoint.WiFiStatus.ACTIVE).build();
        Room room = new Room(); room.setId(20L);

        when(wifiApRepository.findById(10L)).thenReturn(Optional.of(ap));
        when(roomRepository.findById(20L)).thenReturn(Optional.of(room));

        RoomWiFiAccessPoint assignment = RoomWiFiAccessPoint.builder()
                .id(30L).room(room).wifiAccessPoint(ap).isPrimary(false).build();
        when(roomWifiRepository.save(any())).thenReturn(assignment);

        // isPrimary is null
        WiFiAccessPointController.AssignApToRoomRequest req = new WiFiAccessPointController.AssignApToRoomRequest(10L, 80, null, "");
        ResponseEntity<WiFiAccessPointController.RoomWiFiApDTO> result = controller.assignToRoom(20L, req);

        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertFalse(result.getBody().getIsPrimary());
    }

    // =========================================================================
    // 5. Set Primary AP for Room Tests (5 Cases)
    // =========================================================================

    @Test
    void testSetPrimaryAp_Success_SetsTrueOthersFalse() {
        RoomWiFiAccessPoint r1 = RoomWiFiAccessPoint.builder().id(1L).isPrimary(false).build();
        RoomWiFiAccessPoint r2 = RoomWiFiAccessPoint.builder().id(2L).isPrimary(true).build();
        
        when(roomWifiRepository.findByRoomId(20L)).thenReturn(List.of(r1, r2));

        ResponseEntity<Void> result = controller.setPrimaryAp(20L, 1L);
        
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue(r1.getIsPrimary()); // Assignment 1 became true
        assertFalse(r2.getIsPrimary()); // Assignment 2 became false
        verify(roomWifiRepository, times(2)).save(any(RoomWiFiAccessPoint.class));
    }

    @Test
    void testSetPrimaryAp_NotFoundInRoomList() {
        RoomWiFiAccessPoint r1 = RoomWiFiAccessPoint.builder().id(2L).isPrimary(true).build();
        when(roomWifiRepository.findByRoomId(20L)).thenReturn(List.of(r1));

        // Requesting to make assignment 99 primary, which doesn't exist
        ResponseEntity<Void> result = controller.setPrimaryAp(20L, 99L);
        
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void testSetPrimaryAp_EmptyRoomList() {
        when(roomWifiRepository.findByRoomId(20L)).thenReturn(Collections.emptyList());

        ResponseEntity<Void> result = controller.setPrimaryAp(20L, 1L);
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void testSetPrimaryAp_SamePrimary_RemainsTrue() {
        RoomWiFiAccessPoint r1 = RoomWiFiAccessPoint.builder().id(1L).isPrimary(true).build();
        when(roomWifiRepository.findByRoomId(20L)).thenReturn(List.of(r1));

        ResponseEntity<Void> result = controller.setPrimaryAp(20L, 1L);
        
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertTrue(r1.getIsPrimary()); // still true
        verify(roomWifiRepository, times(1)).save(r1);
    }

    @Test
    void testSetPrimaryAp_MultipleOthersUnset() {
        RoomWiFiAccessPoint target = RoomWiFiAccessPoint.builder().id(1L).isPrimary(false).build();
        RoomWiFiAccessPoint other1 = RoomWiFiAccessPoint.builder().id(2L).isPrimary(true).build();
        RoomWiFiAccessPoint other2 = RoomWiFiAccessPoint.builder().id(3L).isPrimary(true).build();

        when(roomWifiRepository.findByRoomId(20L)).thenReturn(List.of(target, other1, other2));

        controller.setPrimaryAp(20L, 1L);
        
        assertTrue(target.getIsPrimary());
        assertFalse(other1.getIsPrimary());
        assertFalse(other2.getIsPrimary());
    }
    // =========================================================================
    // 6. Unassign Access Point from Room Tests (5 Cases)
    // =========================================================================

    @Test
    void testUnassignFromRoom_Success() {
        when(roomWifiRepository.existsById(10L)).thenReturn(true);
        ResponseEntity<Void> result = controller.unassignFromRoom(20L, 10L);
        assertEquals(HttpStatus.NO_CONTENT, result.getStatusCode());
        verify(roomWifiRepository).deleteById(10L);
    }

    @Test
    void testUnassignFromRoom_AssignmentNotFound() {
        when(roomWifiRepository.existsById(99L)).thenReturn(false);
        ResponseEntity<Void> result = controller.unassignFromRoom(20L, 99L);
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
        verify(roomWifiRepository, never()).deleteById(anyLong());
    }

    @Test
    void testUnassignFromRoom_NullAssignmentId() {
        when(roomWifiRepository.existsById(null)).thenReturn(false);
        ResponseEntity<Void> result = controller.unassignFromRoom(20L, null);
        assertEquals(HttpStatus.NOT_FOUND, result.getStatusCode());
    }

    @Test
    void testUnassignFromRoom_ExistsThrowsException() {
        when(roomWifiRepository.existsById(10L)).thenThrow(new RuntimeException("DB check failed"));
        assertThrows(RuntimeException.class, () -> controller.unassignFromRoom(20L, 10L));
    }

    @Test
    void testUnassignFromRoom_DeleteThrowsException() {
        when(roomWifiRepository.existsById(10L)).thenReturn(true);
        doThrow(new RuntimeException("Failed to delete")).when(roomWifiRepository).deleteById(10L);
        assertThrows(RuntimeException.class, () -> controller.unassignFromRoom(20L, 10L));
    }
}
