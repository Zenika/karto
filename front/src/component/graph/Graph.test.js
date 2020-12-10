import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Graph from './Graph';
import D3Graph from './d3/D3Graph';
import { saveSvgAsPng } from 'save-svg-as-png';

jest.mock('./d3/D3Graph');
jest.mock('save-svg-as-png');

describe('Graph component', () => {

    it('displays fullscreen button when document.fullscreenEnabled is set', async () => {
        global.document.fullscreenEnabled = true;
        render(<Graph d3GraphClass={D3Graph}/>);

        expect(screen.queryByLabelText('enter fullscreen')).toBeInTheDocument();
    });

    it('hides fullscreen button when document.fullscreenEnabled is not set', async () => {
        global.document.fullscreenEnabled = false;
        render(<Graph d3GraphClass={D3Graph}/>);

        expect(screen.queryByLabelText('enter fullscreen')).not.toBeInTheDocument();
    });

    it('goes fullscreen when fullscreen button clicked', async () => {
        global.document.fullscreenEnabled = true;
        const mockFullscreen = jest.fn();
        render(<Graph d3GraphClass={D3Graph}/>);
        screen.getByLabelText('graph container').requestFullscreen = mockFullscreen;

        fireEvent.click(screen.getByLabelText('enter fullscreen'));

        expect(mockFullscreen).toHaveBeenCalled();
    });

    it('downloads image when download button clicked', async () => {
        global.document.fullscreenEnabled = true;
        render(<Graph d3GraphClass={D3Graph}/>);

        fireEvent.click(screen.getByLabelText('download'));

        expect(saveSvgAsPng).toHaveBeenCalled();
    });
});
